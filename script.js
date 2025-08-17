document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Load site settings (donation amounts, Stripe key) from JSON
    const settings = await fetch("/site_settings.json").then(res => res.json());

    // --- Stripe Initialization ---
    // This part is critical for the payment form to appear.
    // It's placed before other logic to ensure it runs even if other parts fail.
    const stripe = Stripe(settings.stripe_publishable_key);
    const elements = stripe.elements();
    const cardElement = elements.create("card");
    cardElement.mount("#card-element");

    let selectedAmount = null;

    // --- Dynamic Donation Buttons ---
    // This section is now wrapped in a check to prevent errors.
    const donationButtons = document.getElementById("donation-buttons");
    if (donationButtons) { // This 'if' check is the main fix.
      settings.donation_amounts.forEach(amount => {
        const btn = document.createElement("button");
        btn.textContent = `$${amount}`;
        btn.type = "button";
        btn.addEventListener("click", () => {
          selectedAmount = amount;
          // Clear 'selected' class from all buttons before adding to the clicked one
          document.querySelectorAll("#donation-buttons button").forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
        });
        donationButtons.appendChild(btn);
      });
    } else {
      console.error("Error: The HTML element with id 'donation-buttons' was not found. Donation buttons could not be rendered.");
    }

    // --- Form Submission Logic ---
    const form = document.getElementById("payment-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!selectedAmount) {
          alert("Please select a donation amount first.");
          return;
        }

        // Create PaymentIntent via Netlify Function
        const res = await fetch("/.netlify/functions/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: selectedAmount * 100 }) // convert to cents
        });
        const { clientSecret } = await res.json();

        // Confirm payment with Stripe.js
        const { error } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement }
        });

        if (error) {
            // Check if the error message indicates a user cancellation
            if (error.message && error.message.toLowerCase().includes("cancel")) {
                window.location.href = "/cancel.html";
            } else {
                document.getElementById("error-message").textContent = error.message;
            }
        } else {
          window.location.href = "/success.html";
        }
      });
    }

  } catch (error) {
    console.error("A critical error occurred in the script:", error);
    // Optionally, display a user-friendly error message on the page
    const errorMessageDiv = document.getElementById("error-message");
    if(errorMessageDiv) {
        errorMessageDiv.textContent = "An error occurred while loading the donation form. Please try refreshing the page.";
    }
  }
});
