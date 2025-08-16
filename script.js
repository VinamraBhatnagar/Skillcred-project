document.addEventListener("DOMContentLoaded", async () => {
  // Load site settings (donation amounts, Stripe key) from JSON
  const settings = await fetch("/site_settings.json").then(res => res.json());

  const stripe = Stripe(settings.stripe_publishable_key);
  const elements = stripe.elements();
  const cardElement = elements.create("card");
  cardElement.mount("#card-element");

  let selectedAmount = null;

  // Render donation buttons from settings
  const donationButtons = document.getElementById("donation-buttons");
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

  const form = document.getElementById("payment-form");
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
      document.getElementById("error-message").textContent = error.message;
    } else {
      window.location.href = "/success.html";
    }
  });
});
