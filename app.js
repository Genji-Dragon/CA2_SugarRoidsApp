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
app.use(express.static('public'));

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

// Define routes
app.get('/', checkAuth, (req, res) => {
  res.send(`<h1>Welcome, ${req.session.user.username} (${req.session.user.role})</h1><a href="/logout">Logout</a>`);
});

app.get('/register', (req, res) => {
  res.render('register', { errors: req.flash('error'), formData: {} });
});

app.post('/register', (req, res) => {
  const { username, email, password, role, address, contact } = req.body;

  if (!username || !email || !password || !role || !address || !contact) {
    req.flash('error', 'Please fill in all fields');
    // When redirecting, pass the current request body as formData
    return res.render('register', { errors: req.flash('error'), formData: req.body });
  }

  if (password.length < 6) {
    req.flash('error', 'Password must be at least 6 characters');
    // When redirecting, pass the current request body as formData
    return res.render('register', { errors: req.flash('error'), formData: req.body });
  }

  const sql = 'INSERT INTO users (username, email, password, role, address, contact) VALUES (?, ?, SHA1(?), ?, ?, ?)';
  db.query(sql, [username, email, password, role, address, contact], (err) => {
    if (err) {
      req.flash('error', 'Email already registered or database error');
      // When redirecting, pass the current request body as formData
      return res.render('register', { errors: req.flash('error'), formData: req.body });
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
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.log('Login error:', err);
            req.flash('error', 'Something went wrong.');
            return res.redirect('/login');
        }

        if (results.length > 0) {
            // Save user data in session
            req.session.user = results[0];

            // Redirect based on role
            if (results[0].role === 'admin') {
                return res.redirect('/inventory');  // Admin sees inventory
            } else {
                return res.redirect('/shopping');   // Normal user sees shopping
            }
        } else {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }
    });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/inventory', checkAuth, checkAdmin, (req, res) => {
    // Get the search term from the query parameters, if it exists
    const searchTerm = req.query.search;
    let sql = 'SELECT * FROM products';
    let params = [];

    if (searchTerm) {
        // Add WHERE clause for searching if a search term is provided
        sql += ' WHERE candyName LIKE ?';
        params.push('%' + searchTerm + '%'); // Use % for partial matching
    }

    // Fetch data from MySQL
    db.query(sql, params, (dbError, results) => {
      if (dbError) {
          console.error("Error fetching candy:", dbError); // More specific error logging
          // It's better to render the page with an error message rather than crashing
          return res.render('inventory', {
            products: [],
            user: req.session.user,
            searchTerm: searchTerm,
            error: 'There was an error retrieving inventory from the database.'
          });
      }
      res.render('inventory', {
        products: results,
        user: req.session.user,
        searchTerm: searchTerm,
        error: null
      });
    });
});

app.get('/shopping', checkAuth, (req, res) => {
    // Get the search term from the query parameters, if it exists
    const searchTerm = req.query.search;
    let sql = 'SELECT * FROM products';
    let params = [];

    if (searchTerm) {
        // Add WHERE clause for searching if a search term is provided
        sql += ' WHERE candyName LIKE ?';
        params.push('%' + searchTerm + '%'); // Use % for partial matching
    }

    // Fetch data from MySQL
    db.query(sql, params, (dbError, results) => {
      if (dbError) {
          console.error("Error fetching candy:", dbError); // More specific error logging
          // It's better to render the page with an error message rather than crashing
          return res.render('shopping', {
            products: [],
            user: req.session.user,
            searchTerm: searchTerm,
            error: 'There was an error retrieving candy for shopping.'
          });
      }
      res.render('shopping', {
        user: req.session.user,
        products: results,
        searchTerm: searchTerm,
        error: null
      });
    });
});

app.post('/add-to-cart/:id', checkAuth, (req, res) => {
    const candyId = parseInt(req.params.id);
    const quantity = parseInt(req.body.quantity) || 1;

    db.query('SELECT * FROM products WHERE candyId = ?', [candyId], (error, results) => {
        if (error) throw error;

        if (results.length > 0) {
            const product = results[0];

            // Initialize cart in session if not exists
            if (!req.session.cart) {
                req.session.cart = [];
            }

            // Check if product already in cart
            const existingItem = req.session.cart.find(item => item.candyId === candyId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                req.session.cart.push({
                    candyId: product.candyId,
                    candyName: product.candyName,
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

app.get('/cart', checkAuth, (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart', { cart, user: req.session.user });
});

app.get('/candy/:id', checkAuth, (req, res) => {
  // Extract the product ID from the request parameters
  const candyId = req.params.id;

  // Fetch data from MySQL based on the product ID
  db.query('SELECT * FROM products WHERE candyId = ?', [candyId], (error, results) => {
      if (error) throw error;

      // Check if any product with the given ID was found
      if (results.length > 0) {
          // Render HTML page with the product data
          res.render('candy', { candy: results[0], user: req.session.user  });
      } else {
          // If no product with the given ID was found, render a 404 page or handle it accordingly
          res.status(404).send('Candy not found');
      }
  });
});


app.get('/addCandy', checkAuth, checkAdmin, (req, res) => {
    res.render('addCandy', {user: req.session.user } ); 
});

app.post('/addCandy', upload.single('image'),  (req, res) => {
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
    db.query(sql , [candyId, candyName, quantity, price, image, description, ingredients, allergens, storageInstructions, madeIn], (error, results) => {
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


app.get('/updateProductCandy/:id',checkAuth, checkAdmin, (req,res) => {
    const candyId = req.params.id;
    const sql = 'SELECT * FROM products WHERE candyId = ?';

    // Fetch data from MySQL based on the product ID
    db.query(sql , [candyId], (error, results) => {
        if (error) throw error;

        // Check if any product with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the product data
            res.render('updateCandy', { product: results[0] });
        } else {
            // If no product with the given ID was found, render a 404 page or handle it accordingly
            res.status(404).send('Candy not found');
        }
    });
});

app.post('/updateProductCandy/:id', upload.single('image'), (req, res) => {
    const candyId = req.params.id;
    // Extract product data from the request body
    const { name, quantity, price } = req.body;
    let image  = req.body.currentImage; //retrieve current image filename
    if (req.file) { //if new image is uploaded
        image = req.file.filename; // set image to be new image filename
    } 

    const sql = 'UPDATE products SET candyName = ? , quantity = ?, price = ?, image =? WHERE candyId = ?';
    // Insert the new product into the database
    db.query(sql, [candyName, quantity, price, image, candyId], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error updating candy:", error);
            res.status(500).send('Error updating candy');
        } else {
            // Send a success response
            res.redirect('/inventory');
        }
    });
});

// DELETE PRODUCT (Admin Only)
app.get('/deleteProduct/:id', checkAuth, checkAdmin, (req, res) => { const candyId = req.params.id;

// Step 1: Delete the product from the database
    const deleteQuery = 'DELETE FROM products WHERE candyId = ?';
    db.query(deleteQuery, [candyId], (err, result) => {
        if (err) {
            console.error("Error deleting candy from DB:", err);
            req.flash('error', 'Error deleting candy from Database');
            return res.status(500).redirect('/inventory');
        }
        req.flash('success', 'Candy deleted successfully (image file remains on server).');
        res.redirect('/inventory');
    });
});

// Route to display all users (Admin Only)
app.get('/admin/users', checkAuth, checkAdmin, (req, res) => {
    const sql = 'SELECT id, username, email, role, address, contact FROM users'; // Don't fetch passwords!
    db.query(sql, (err, users) => {
        if (err) {
            console.error("Error fetching users:", err);
            req.flash('error', 'Error retrieving users from database.');
            return res.redirect('/inventory'); // Or to an admin dashboard
        }
        res.render('adminUsers', { users: users, user: req.session.user, error: req.flash('error'), success: req.flash('success') });
    });
});

// Route to handle user deletion (Admin Only)
app.post('/admin/users/delete/:id', checkAuth, checkAdmin, (req, res) => {
    const userIdToDelete = req.params.id;
    const loggedInUserId = req.session.user.id;

    // IMPORTANT: Add an additional check here if you don't want admins to delete themselves
    if (req.session.user.id == loggedInUserId) {
        req.flash('error', 'You cannot delete your own account!');
        return res.redirect('/admin/users');
    }

    const sql = 'DELETE FROM users WHERE id = ?';
    db.query(sql, [userIdToDelete], (err, result) => {
        if (err) {
            console.error("Error deleting user:", err);
            req.flash('error', 'Error deleting user from database.');
            return res.redirect('/admin/users');
        }
        if (result.affectedRows === 0) {
            req.flash('error', 'User not found.');
        } else {
            req.flash('success', 'User deleted successfully.');
        }
        res.redirect('/admin/users');
    });
});
 
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${3000}`);
});