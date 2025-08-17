document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Load site settings from JSON
    const settings = await fetch("/site_settings.json").then(res => res.json());

    // Populate page content from settings
    document.getElementById('title').textContent = settings.title || "Donation Title";
    document.getElementById('description').textContent = settings.description || "Tagline about the cause.";

    // --- Stripe Initialization ---
    const stripe = Stripe(settings.stripe_publishable_key);
    const elements = stripe.elements();
    const cardElement = elements.create("card");
    cardElement.mount("#card-element");

    let selectedAmount = null;

    // --- Dynamic Donation Buttons ---
    const donationButtons = document.getElementById("donation-buttons");
    if (donationButtons && settings.donation_amounts) {
      settings.donation_amounts.forEach(amount => {
        const btn = document.createElement("button");
        btn.textContent = `$${amount}`;
        btn.type = "button";
        btn.addEventListener("click", () => {
          selectedAmount = amount;
          document.querySelectorAll("#donation-buttons button").forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
        });
        donationButtons.appendChild(btn);
      });
    } else {
      console.error("Error: Could not find '#donation-buttons' element or 'donation_amounts' in settings.");
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

        // ✅ Get the email BEFORE creating the PaymentIntent
        const donorEmail = document.getElementById('email-input').value;

        // ✅ Send amount + email to Netlify Function
        const res = await fetch("/.netlify/functions/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            amount: selectedAmount * 100, // convert to cents
            email: donorEmail             // <-- NEW
          })
        });
        const { clientSecret } = await res.json();

        // Confirm payment with Stripe.js, still including the email
        const { error } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              email: donorEmail, // Stripe will store this inside the PaymentMethod
            },
          }
        });

        if (error) {
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
    const errorMessageDiv = document.getElementById("error-message");
    if (errorMessageDiv) {
      errorMessageDiv.textContent = "An error occurred while loading the donation form. Please try refreshing the page.";
    }
  }
});
