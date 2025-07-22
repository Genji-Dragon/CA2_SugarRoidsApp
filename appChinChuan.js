//  GET route to render the update product form page
app.get('/updateProductCandy/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const productId = req.params.id; //  Extract the product ID from URL

    const sql = 'SELECT * FROM products WHERE productId = ?'; //  SQL query to get product details

    connection.query(sql, [productId], (error, results) => {
        if (error) return res.status(500).send('Database error'); // Handle database query error

        if (results.length === 0) {
            return res.status(404).send('Product not found'); //  Product not found in DB
        }

        res.render('updateProduct', { product: results[0] }); // Render form with product data
    });
});

//  POST route to handle form submission and update the product
app.post('/updateProductCandy/:id', upload.single('image'), (req, res) => {
    const productId = req.params.id; // 🆔 Extract product ID from URL

    // Extract submitted product data from form
    const { name, quantity, price, currentImage } = req.body;

    // Determine which image to use: new upload or existing
    const image = req.file?.filename || currentImage;

    // SQL query to update product in the database
    const sql = `
        UPDATE products
        SET productName = ?, quantity = ?, price = ?, image = ?
        WHERE productId = ?
    `;

    connection.query(sql, [name, quantity, price, image, productId], (error) => {
        if (error) {
            console.error('Error updating product:', error); //  Log error for debugging
            return res.status(500).send('Error updating product'); //  Send failure response
        }

        res.redirect('/inventory'); //  Redirect to inventory after successful update
    });
});