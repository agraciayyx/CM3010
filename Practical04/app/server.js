// --- Simulated Current User (Step 2) ---
// This variable simulates the user session. Change 'id' to 1, 2, or 3 to test roles.
// 1: Administrator, 2: Manager, 3: Standard User
const CURRENT_USER = {
    id: 2, // Change this to test different roles
    username: 'test_user', // This will be fetched from the DB later
    role_id: 2  // Change this to match the id
};
// --- End of User Simulation ---

// --- Step 2: Setup Express, Mustache, Session Simulation, and Database Connection ---

// --- 1. Import Libraries ---
const express = require('express');        // Import the Express framework
const mustacheExpress = require('mustache-express'); // Import the Mustache adapter for Express
const mysql = require('mysql');            // Import the MySQL client library
const cookieParser = require('cookie-parser');
// --- End of Import ---

// --- 2. Initialize Express App ---
const app = express();                     // Create an Express application instance
const PORT = 3000;                        // Define the port number the server will listen on
// --- End of Initialization ---

// --- 3. Simulate a Simple Session Store ---
// This is a temporary in-memory store - NOT suitable for production.
// In a real app, you'd use 'express-session' with a proper store (e.g., Redis, database).
let sessions = {}; // { sessionId: { userId: X, username: Y, roleId: Z }, ... }
app.use(cookieParser()); // <-- ADD THIS LINE BEFORE session loading middleware

// --- 4. Middleware: Simulate Loading Session Data ---
// Middleware functions run before the route handlers.
// This one checks for a 'sessionId' cookie and attaches session data to the request object.
app.use((req, res, next) => {
    // req.cookies is populated by a cookie parsing middleware (not explicitly added here, but Node.js/Express handles basic cookie reading)
    const sessionId = req.cookies?.sessionId; // Get the sessionId from the incoming request's cookies
    if (sessionId && sessions[sessionId]) {   // If a sessionId exists AND it's in our simulated store
        req.session = sessions[sessionId];    // Attach the stored user data to the request object
    } else {
        req.session = null;                   // Otherwise, set session to null (not logged in)
    }
    next(); // Call next() to pass control to the next middleware or route handler
});
// --- End of Session Simulation ---

// --- 5. Serve Static Files (Optional) ---
app.use(express.static('public')); // Serve files like CSS, JS, images from the 'public' folder
// --- End of Static Files ---

// --- 6. Middleware: Parse Form Data ---
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies (e.g., from HTML forms)
// --- End of Body Parsing ---

// --- 7. Configure Mustache Templating ---
app.engine('mustache', mustacheExpress()); // Register 'mustache' as a view engine
app.set('view engine', 'mustache');       // Tell Express to use 'mustache' for rendering views
app.set('views', './views');             // Tell Express where to find the .mustache files
// --- End of Mustache Configuration ---

// --- 8. Connect to Database ---
const db = mysql.createConnection({
    host: 'host.docker.internal',// The address of the MySQL server (usually localhost for local dev)
    user: 'root', // Your MySQL username (e.g., 'root')
    password: 'root_secure_123!',
    database: 'cm3010_db_P04'  // The specific database name to connect to
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        process.exit(1); // Exit the application if DB connection fails
    }
    console.log('Connected to MySQL database: cm3010_db_P04');
});
// --- End of Database Connection ---

// --- Step 2: Middleware: Check if user is logged in and fetch details (Topic 4: Security) ---
// This function will be used as middleware for routes that require authentication.
// It checks the session, validates the user against the database, and adds user details to req.session.
function requireAuth(req, res, next) {
    // 1. Check if a session exists (i.e., if req.session was populated by the initial middleware)
    if (!req.session) {
        // If no session exists, the user is not logged in.
        // Redirect them to the login page.
        console.log("Access denied: No active session. Redirecting to /login.");
        return res.redirect('/login');
    }

    // 2. If a session exists, verify the user's identity against the database.
    // This ensures the session ID hasn't been tampered with and the user still exists.
    // Use the userId stored in the session object to query the database.
    // Concept from Transcript: Using JOINs, Aggregate functions (though not used here, the query structure is similar)
    const userQuery = `
        SELECT u.id, u.username, r.name AS role_name, r.id AS role_id
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
    `;

    // Execute the database query using the database connection object 'db'.
    // Concept from Transcript: Libraries send commands, parameterised queries for security
    db.query(userQuery, [req.session.userId], (err, results) => {
        // 3. Handle potential database errors during the user verification query.
        if (err) {
            console.error('Error verifying user session against database:', err);
            // If the database query itself fails, send a generic server error.
            // Do not expose internal error details to the user.
            return res.status(500).send('Database Error during session verification.');
        }

        // 4. Check if the user ID from the session actually corresponds to a user in the database.
        if (results.length === 0) {
            console.log("Session user ID not found in database. Clearing session and redirecting.");
            // If the user doesn't exist in the DB, the session is invalid.
            req.session = null; // Clear the invalid session data from the request object
            // Redirect to the login page as the user is no longer valid.
            return res.redirect('/login');
        }

        // 5. User is valid. Update the req.session object with the latest details from the database.
        // This ensures the session data is fresh and accurate for the upcoming route handler.
        const user = results[0];
        req.session.username = user.username;
        req.session.roleName = user.role_name;
        req.session.roleId = user.role_id;

        // 6. If the session is valid and user is verified, call 'next()'.
        // This passes control to the next middleware function in the chain,
        // or to the final route handler if this is the last middleware before the route.
        console.log(`Session verified for user: ${user.username} (Role: ${user.role_name})`);
        next();
    });
}
// --- End of Middleware: requireAuth --

// --- Phase 3: Add Product Feature ---

// --- Step 1: GET Route to Show Add Product Form ---
app.get('/add-product', requireAuth, (req, res) => {
    // The requireAuth middleware ensures req.session is valid and populated
    // req.session contains { userId, username, roleId, roleName }

    // --- Check User Role ---
    // Verify if the logged-in user has permission to add a product (Manager or Admin)
    const userRoleName = req.session.roleName;
    if (userRoleName !== 'Manager' && userRoleName !== 'Administrator') {
        // If the user is not a Manager or Administrator, deny access
        console.log(`Access denied to /add-product for user ${req.session.username} (Role: ${userRoleName})`);
        // Send a 403 Forbidden response or render an error page
        return res.status(403).send('Access Denied: Only Managers and Administrators can add products.');
    }

    // --- Fetch Categories for the Form ---
    // The form needs a dropdown list of available categories.
    // Query the 'categories' table to get all category names and IDs.
    // Concept from Transcript: "SELECT gets information in the form of a table... FROM, and then the list of tables"
    const categoriesQuery = 'SELECT id, name FROM categories ORDER BY name';

    // Execute the query using the database connection object 'db'
    // Concept from Transcript: "Libraries send commands... [db.query(...) for SELECT]"
    db.query(categoriesQuery, (err, categoryResults) => {
        // --- Handle Database Query Errors ---
        if (err) {
            console.error('Error fetching categories for add-product form:', err);
            // Log the error and send a generic server error response
            // Never expose internal error details directly to the user
            return res.status(500).send('Database Error: Could not load categories.');
        }

        // --- Prepare Data for Template (Topic 4: Web Templating) ---
        // Create the context object that will be passed to the Mustache template
        const context = {
            // Pass user information to the template (e.g., for welcome message, navigation)
            currentUser: {
                username: req.session.username,
                roleName: req.session.roleName,
                isAdmin: req.session.roleName === 'Administrator',
                isManager: req.session.roleName === 'Manager'
            },
            // Pass the list of categories retrieved from the database
            categories: categoryResults
            // Note: No 'error' field is passed here initially, as this is the GET route (displaying the form)
        };

        // --- Render the Template (Topic 4: Web Templating) ---
        // Use res.render to process the 'add-product.mustache' template
        // with the 'context' object containing user details and categories
        console.log(`Rendering add-product form for user ${req.session.username}`);
        res.render('add-product', context);
    });
});
// --- End of Step 1: GET Route ---

// --- Step 2: POST Route to Handle Form Submission ---
app.post('/add-product', requireAuth, (req, res) => {
    // The requireAuth middleware ensures req.session is valid and populated
    // req.session contains { userId, username, roleId, roleName }

    // --- Check User Role (Again) ---
    // It's important to check the role again on the POST request,
    // as users could potentially craft direct POST requests bypassing the GET form.
    const userRoleName = req.session.roleName;
    if (userRoleName !== 'Manager' && userRoleName !== 'Administrator') {
        console.log(`Unauthorized POST attempt to /add-product by user ${req.session.username}`);
        return res.status(403).send('Access Denied: Only Managers and Administrators can add products.');
    }

    // --- Extract Form Data from Request Body ---
    // The data submitted via the HTML form is available in req.body
    // (parsed by the express.urlencoded middleware defined in Phase 2).
    // Concept from Transcript: "Libraries send commands... [receiving data via req.body]"
    const { name, category_id, unit_price, stock_quantity } = req.body;

    // --- Basic Input Validation ---
    // Check if required fields are present and not empty strings.
    // Concept from Transcript: "security considerations" - validate input before using it.
    if (!name || !category_id || !unit_price || !stock_quantity) {
        // If validation fails, re-render the form with an error message.
        // This requires fetching categories again to populate the dropdown.
        const categoriesQuery = 'SELECT id, name FROM categories ORDER BY name';
        db.query(categoriesQuery, (err, categoryResults) => {
            if (err) {
                console.error('Error fetching categories for error display:', err);
                return res.status(500).send('Database Error.');
            }
            // Pass user details, categories, and the error message back to the template
            res.render('add-product', {
                currentUser: {
                    username: req.session.username,
                    roleName: req.session.roleName,
                    isAdmin: req.session.roleName === 'Administrator',
                    isManager: req.session.roleName === 'Manager'
                },
                categories: categoryResults,
                error: 'All fields are required.' // Pass the error message
            });
        });
        return; // Stop execution after rendering the error page
    }

    // --- Validate Data Types (Optional but Recommended) ---
    // Ensure unit_price and stock_quantity are valid numbers
    const price = parseFloat(unit_price);
    const quantity = parseInt(stock_quantity);
    if (isNaN(price) || isNaN(quantity) || price < 0 || quantity < 0) {
         // If validation fails, re-render the form with an error message.
         const categoriesQuery = 'SELECT id, name FROM categories ORDER BY name';
         db.query(categoriesQuery, (err, categoryResults) => {
            if (err) {
                console.error('Error fetching categories for error display:', err);
                return res.status(500).send('Database Error.');
            }
            res.render('add-product', {
                currentUser: {
                    username: req.session.username,
                    roleName: req.session.roleName,
                    isAdmin: req.session.roleName === 'Administrator',
                    isManager: req.session.roleName === 'Manager'
                },
                categories: categoryResults,
                error: 'Unit price and stock quantity must be valid numbers >= 0.'
            });
        });
        return;
    }

    // --- Database Query: Insert New Product (Security Critical) ---
    // Use a parameterised INSERT query to safely add the new product.
    // Concept from Transcript: "security considerations" and "parameterised queries".
    // Using ? placeholders prevents SQL injection by ensuring user input is treated as data, not SQL code.
    // Concept from Transcript: "INSERT is for adding new rows..."
    const insertQuery = 'INSERT INTO products (name, category_id, unit_price, stock_quantity) VALUES (?, ?, ?, ?)';

    // Execute the INSERT query using the database connection object 'db'
    // Pass the validated and parsed form data as parameters in an array
    // Concept from Transcript: "Libraries send commands... [db.query(...) for INSERT]"
    db.query(insertQuery, [name, parseInt(category_id), price, quantity], (err, results) => {
        // --- Handle Database Query Errors (e.g., constraint violations) ---
        if (err) {
            console.error('Error inserting new product:', err);
            // Log the specific error, potentially handle unique constraint errors here if name is unique
            // Send a generic error response to the user
            return res.status(500).send('Database Error: Could not add the product.');
        }

        // --- Success: Log and Redirect ---
        // If the query executes successfully, log the action and redirect.
        // Logging the insert ID can be useful for debugging/auditing.
        console.log(`New product added successfully by user ${req.session.username}. Insert ID: ${results.insertId}`);
        // Redirect back to the main inventory dashboard ('/') after successful insertion.
        // This prevents accidental resubmission if the user refreshes the page.
        res.redirect('/');
    });
});
// --- End of Step 2: POST Route ---

// --- Step 3: Login Routes ---

// GET route to show the login page
app.get('/login', (req, res) => {
    // Check if a user is already logged in by checking the session
    // req.session was populated by the middleware in Step 2
    if (req.session) {
        // If a session exists (user is logged in), redirect them to the main dashboard
        // This prevents users from accessing the login page if they are already authenticated
        return res.redirect('/');
    }
    // If no session exists (user is not logged in), render the login template
    // No data needs to be passed here, so just call res.render with the template name
    res.render('login');
});

// POST route to handle login form submission
app.post('/login', (req, res) => {
    // Extract username and password from the form data sent by the client
    // This is possible because of the express.urlencoded middleware configured in Step 2
    const { username, password } = req.body;

    // --- Basic Validation ---
    // Check if username or password fields are empty
    if (!username || !password) {
        // If validation fails, re-render the login page with an error message
        // The error message is passed as an object to the template context
        return res.render('login', { error: 'Username and password are required.' });
    }

    // --- Database Query: Authenticate User ---
    // Construct an SQL query to find the user and their role in the database
    // We JOIN the 'users' and 'roles' tables to get both user details and their role name in one query
    // IMPORTANT: Use a parameterised query (WHERE u.username = ?) to prevent SQL injection
    const userQuery = `
        SELECT u.id, u.username, u.password, r.name AS role_name, r.id AS role_id
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.username = ?
    `;

    // Execute the query using the database connection object 'db'
    // Pass the username (from the form) as a parameter to the query
    db.query(userQuery, [username], (err, results) => {
        // --- Handle Database Errors ---
        if (err) {
            console.error('Error during login query:', err);
            // If a database error occurs, log it and show a generic error page
            // Never expose internal error details directly to the user
            return res.render('login', { error: 'Database error occurred.' });
        }

        // --- Check if User Exists ---
        if (results.length === 0) {
            // If the query returns no rows, the username was not found
            // Return to the login page with an error message
            return res.render('login', { error: 'Invalid username or password.' });
        }

        // --- User Found: Verify Password ---
        // Get the user record from the database results
        const user = results[0]; // results is an array, so we get the first (and only expected) row

        // IMPORTANT: In a real application, passwords should be hashed and compared using a library like bcrypt.
        // For this practical, we are comparing plain text passwords directly from the database.
        if (user.password !== password) {
            // If the password from the form doesn't match the one in the database
            // Return to the login page with an error message
            return res.render('login', { error: 'Invalid username or password.' });
        }

        // --- Successful Authentication ---
        // If we reach this point, the username exists and the password is correct.
        console.log(`User ${user.username} authenticated successfully.`);

        // --- Create Session ---
        // Generate a unique session ID. In a real app, use a secure random generator like crypto.randomUUID()
        // For this practical, a combination of timestamp and random string is sufficient.
        const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

        // Store the user's essential information in our simulated session store (defined in Step 2)
        // This links the session ID to the user's data
        sessions[sessionId] = {
            userId: user.id,        // The unique database ID of the user
            username: user.username, // The username
            roleId: user.role_id,    // The database ID of the user's role
            roleName: user.role_name // The name of the user's role (e.g., "Administrator")
        };

        // --- Set Session Cookie ---
        // Send the generated session ID back to the client's browser as a cookie
        // The browser will send this cookie back with every subsequent request
        // This allows the server to identify the user on later requests using the middleware
        // Set maxAge to 24 hours (in milliseconds)
        res.cookie('sessionId', sessionId, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true }); // httpOnly is a security best practice

        console.log(`Session created for user ${user.username}. Session ID: ${sessionId}`);

        // --- Redirect ---
        // After successful login, redirect the user to the main dashboard ('/')
        // This prevents issues with browser back button and resubmission of the login form
        res.redirect('/');
    });
});
// --- End of Login Routes ---

// --- Step 5: Logout Route ---

// Define a GET route for the '/logout' endpoint
app.get('/logout', (req, res) => {
    // --- Clear the Session Cookie ---
    // Use res.clearCookie to remove the 'sessionId' cookie from the client's browser.
    // The cookie name ('sessionId') must match the one set during login (in the POST /login route).
    res.clearCookie('sessionId');

    // --- Optional: Clean up Server-Side Session Store ---
    // In our simulated in-memory session store ('sessions' object),
    // remove the entry corresponding to the current user's session ID.
    // This is good practice to free up memory and ensure the session is truly gone.
    // Check if a session ID exists in the request's cookies before trying to delete it.
    const currentSessionId = req.cookies.sessionId;
    if (currentSessionId && sessions[currentSessionId]) {
        delete sessions[currentSessionId]; // Remove the session data from our store
        console.log(`Session ${currentSessionId} cleared for user.`);
    } else {
        console.log('Logout attempted, but no active session found in store.');
    }

    // --- Redirect to Login ---
    // After clearing the cookie and server-side session data,
    // redirect the user to the login page.
    // This provides a clear indication that the logout was successful
    // and prevents access to protected pages without re-authentication.
    res.redirect('/login');
});

// --- End of Logout Route ---

// --- Step 5: Main Route (GET /) ---

app.get('/', requireAuth, (req, res) => {
    // The requireAuth middleware ensures req.session is valid and populated
    // with the user's details (userId, username, roleId, roleName).

    // Use the userId from the session to fetch user details and role name
    // This double-checks the user's identity and role from the database.
    const userQuery = `
        SELECT u.username, r.name AS role_name, r.id AS role_id
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
    `;

    // Execute the query using the database connection object 'db'
    // The '?' is a parameter placeholder for the user ID from the session
    db.query(userQuery, [req.session.userId], (err, userResults) => {
        // --- Handle Database Errors ---
        if (err) {
            console.error('Error fetching user details:', err);
            // If the query itself fails, send a generic server error
            return res.status(500).send('Database Error');
        }

        // --- Validate User Still Exists ---
        // If the user ID from the session doesn't exist in the database anymore
        // (e.g., admin deleted the user while session was active),
        // the session is invalid. Clear it and redirect to login.
        if (userResults.length === 0) {
            console.log('Session user ID not found in database. Clearing session.');
            req.session = null; // Clear the invalid session data
            return res.redirect('/login'); // Redirect to login page
        }

        // Get the user details from the query result
        const user = userResults[0];

        // Determine boolean flags for the user's role for use in the template
        const isAdmin = user.role_name === 'Administrator';
        const isManager = user.role_name === 'Manager';
        const isUser = user.role_name === 'Standard User';

        // --- Fetch Inventory Data ---
        // Query to get full inventory with category names (JOIN)
        // This is the same query used in the original version, now executed after user validation
        const inventoryQuery = `
            SELECT p.id, p.name, p.unit_price, p.stock_quantity, c.name AS category_name
            FROM products p
            JOIN categories c ON p.category_id = c.id
            ORDER BY p.name
        `;

        // Execute the inventory query
        db.query(inventoryQuery, (err, productResults) => {
            // --- Handle Database Errors for Inventory ---
            if (err) {
                console.error('Error fetching inventory:', err);
                return res.status(500).send('Database Error');
            }

            // --- Prepare Data for Template ---
            // Create the context object that will be passed to the Mustache template 'index.mustache'
            const context = {
                // Pass user information (including role flags) to the template
                currentUser: {
                    username: user.username,
                    roleName: user.role_name,
                    isAdmin: isAdmin,
                    isManager: isManager,
                    isUser: isUser
                },
                // Pass the list of products to the template
                products: productResults // The array of products with category names
            };

            // --- Render the Template ---
            // Use res.render to process the 'index.mustache' template
            // with the 'context' object, generating the final HTML page
            res.render('index', context);
        });
    });
});
// --- End of Main Route ---

// --- Step 7: Start the Server ---

app.listen(PORT, () => {
    console.log(`CSH Inventory App listening at http://localhost:${PORT}`);
    console.log('Session simulation enabled. Use /login to access the application.');
});

// --- End of Server Start ---
