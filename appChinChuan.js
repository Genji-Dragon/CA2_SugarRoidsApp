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