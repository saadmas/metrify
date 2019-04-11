require('./app.js');
// globals //

// ensure elements are present before running scripts on 'em ...
document.addEventListener("DOMContentLoaded", DOMContentLoaded);
function DOMContentLoaded() {

    const loginButton = document.querySelector(".login-btn");
    loginButton.addEventListener("click", connectToSpotify);
}

// Helper functions //

function connectToSpotify() {

    
    
}
