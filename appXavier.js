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