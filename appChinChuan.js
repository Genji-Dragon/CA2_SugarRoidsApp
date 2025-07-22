//  GET route to render the update product form based on product ID
app.get('/updateProductCandy/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const productId = req.params.id; //  Extract product ID from URL

    const sql = 'SELECT * FROM products WHERE productId = ?'; // 🔍 SQL query to fetch product info

    connection.query(sql, [productId], (error, results) => {
        if (error) {
            //  Query error – send server error response
            return res.status(500).send('Database error');
        }

        if (results.length === 0) {
            //  No matching product – send not found
            return res.status(404).send('Product not found');
        }

        //  Render update form with fetched product data
        res.render('updateProduct', { product: results[0] });
    });
});

//  POST route to process and update the submitted product form
app.post('/updateProductCandy/:id', upload.single('image'), (req, res) => {
    const productId = req.params.id; //  Extract product ID from URL

    //  Get submitted data from the request body
    const { name, quantity, price, currentImage } = req.body;

    // Use uploaded image filename if available; otherwise, keep existing one
    const image = req.file?.filename || currentImage;

    //  SQL query to update product details in the DB
    const sql = `
        UPDATE products
        SET productName = ?, quantity = ?, price = ?, image = ?
        WHERE productId = ?
    `;

    connection.query(sql, [name, quantity, price, image, productId], (error, results) => {
        if (error) {
            //  Error during update – log and inform user
            console.error('Error updating product:', error);
            return res.status(500).send('Error updating product');
        }

        //  Optional: Log affected rows for debugging
        console.log('Product updated. Rows affected:', results.affectedRows);

        //  Redirect to inventory page after successful update
        res.redirect('/inventory');
    });
});