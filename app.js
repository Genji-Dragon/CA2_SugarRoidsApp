const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;


// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
}); // comment

const upload = multer({ storage: storage });

const db = mysql.createConnection({
  host: 'sgevmu.h.filess.io',
  port: 61002,
  user: 'C237CA2_badsickdid',
  password: 'e80264a28ac62cbb30aaaf37bcc57b8edbde70f0',
  database: 'C237CA2_badsickdid'
});

db.connect(() => {
  console.log('Connected to remote MySQL database');
});


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false
}));

app.use(flash());

// Middleware to check if user is logged in
const checkAuth = (req, res, next) => {
  if (req.session.user) return next();
  req.flash('error', 'You must be logged in');
  res.redirect('/login');
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') return next();
  req.flash('error', 'Access denied');
  res.redirect('/');
};

// Middleware for form validation
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;

    if (!username || !email || !password || !address || !contact || !role) {
        return res.status(400).send('All fields are required.');
    }
    
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// Define routes
app.get('/', checkAuth, (req, res) => {
  res.send(`<h1>Welcome, ${req.session.user.username} (${req.session.user.role})</h1><a href="/logout">Logout</a>`);
});

app.get('/inventory', checkAuthenticated, checkAdmin, (req, res) => {
    // Fetch data from MySQL
    connection.query('SELECT * FROM products', (error, results) => {
      if (error) throw error;
      res.render('inventory', { products: results, user: req.session.user });
    });
});

app.get('/register', (req, res) => {
  res.render('register', { errors: req.flash('error') });
});

app.post('/register', (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    req.flash('error', 'Please fill in all fields');
    return res.redirect('/register');
  }

  if (password.length < 6) {
    req.flash('error', 'Password must be at least 6 characters');
    return res.redirect('/register');
  }

  const sql = 'INSERT INTO users (username, email, password, role) VALUES (?, ?, SHA1(?), ?)';
  db.query(sql, [username, email, password, role], (err) => {
    if (err) {
      req.flash('error', 'Email already registered or database error');
      return res.redirect('/register');
    }
    req.flash('success', 'Registration successful! Please login.');
    res.redirect('/login');
  });
});

app.get('/login', (req, res) => {
  res.render('login', { errors: req.flash('error'), success: req.flash('success') });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash('error', 'Please enter both email and password');
    return res.redirect('/login');
  }

  const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
  db.query(sql, [email, password], (err, results) => {
    if (!err && results.length > 0) {
      req.session.user = {
        id: results[0].id,
        username: results[0].username,
        role: results[0].role
      };
      res.redirect('/');
    } else {
      req.flash('error', 'Invalid email or password');
      res.redirect('/login');
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/shopping', checkAuthenticated, (req, res) => {
    // Fetch data from MySQL
    connection.query('SELECT * FROM products', (error, results) => {
        if (error) throw error;
        res.render('shopping', { user: req.session.user, products: results });
      });
});

app.post('/add-to-cart/:id', checkAuthenticated, (req, res) => {
    const productId = parseInt(req.params.id);
    const quantity = parseInt(req.body.quantity) || 1;

    connection.query('SELECT * FROM products WHERE productId = ?', [productId], (error, results) => {
        if (error) throw error;

        if (results.length > 0) {
            const product = results[0];

            // Initialize cart in session if not exists
            if (!req.session.cart) {
                req.session.cart = [];
            }

            // Check if product already in cart
            const existingItem = req.session.cart.find(item => item.productId === productId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                req.session.cart.push({
                    productId: product.productId,
                    productName: product.productName,
                    price: product.price,
                    quantity: quantity,
                    image: product.image
                });
            }

            res.redirect('/cart');
        } else {
            res.status(404).send("Product not found");
        }
    });
});

app.get('/cart', checkAuthenticated, (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart', { cart, user: req.session.user });
});

app.get('/product/:id', checkAuthenticated, (req, res) => {
  // Extract the product ID from the request parameters
  const candyId = req.params.id;

  // Fetch data from MySQL based on the product ID
  connection.query('SELECT * FROM products WHERE candyId = ?', [candyId], (error, results) => {
      if (error) throw error;

      // Check if any product with the given ID was found
      if (results.length > 0) {
          // Render HTML page with the product data
          res.render('product', { product: results[0], user: req.session.user  });
      } else {
          // If no product with the given ID was found, render a 404 page or handle it accordingly
          res.status(404).send('Product not found');
      }
  });
});


app.get('/addProduct', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addProduct', {user: req.session.user } ); 
});

app.post('/addProduct', upload.single('image'),  (req, res) => {
    // Extract product data from the request body
    const { candyId, candyName, quantity, price, description, ingredients, allergens, storageInstructions, madeIn} = req.body;
    let image;
    if (req.file) {
        image = req.file.filename; // Save only the filename
    } else {
        image = null;
    }

    const sql = 'INSERT INTO products (candyId, candyName, quantity, price, image, description, ingredients, allergens, storageInstructions, madeIn) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    // Insert the new product into the database
    connection.query(sql , [candyId, candyName, quantity, price, image, description, ingredients, allergens, storageInstructions, madeIn], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error adding product:", error);
            res.status(500).send('Error adding product');
        } else {
            // Send a success response
            res.redirect('/inventory');
        }
    });
});


app.get('/updateProductCandy/:id',checkAuthenticated, checkAdmin, (req,res) => {
    const productId = req.params.id;
    const sql = 'SELECT * FROM products WHERE candyId = ?';

    // Fetch data from MySQL based on the product ID
    connection.query(sql , [productId], (error, results) => {
        if (error) throw error;

        // Check if any product with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the product data
            res.render('updateProduct', { product: results[0] });
        } else {
            // If no product with the given ID was found, render a 404 page or handle it accordingly
            res.status(404).send('Product not found');
        }
    });
});

app.post('/updateProductCandy/:id', upload.single('image'), (req, res) => {
    const productId = req.params.id;
    // Extract product data from the request body
    const { name, quantity, price } = req.body;
    let image  = req.body.currentImage; //retrieve current image filename
    if (req.file) { //if new image is uploaded
        image = req.file.filename; // set image to be new image filename
    } 

    const sql = 'UPDATE products SET candyName = ? , quantity = ?, price = ?, image =? WHERE candyId = ?';
    // Insert the new product into the database
    connection.query(sql, [name, quantity, price, image, productId], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error updating product:", error);
            res.status(500).send('Error updating product');
        } else {
            // Send a success response
            res.redirect('/inventory');
        }
    });
});

app.get('/deleteProduct/:id', (req, res) => {
    const productId = req.params.id;

    connection.query('DELETE FROM products WHERE productId = ?', [productId], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error deleting product:", error);
            res.status(500).send('Error deleting product');
        } else {
            // Send a success response
            res.redirect('/inventory');
        }
    });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${3000}`);
});