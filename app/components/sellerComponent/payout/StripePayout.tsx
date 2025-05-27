"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface StripePayoutFormData {
  amount: number;
  currency: string;
}

export default function StripePayout() {
  const [formData, setFormData] = useState<StripePayoutFormData>({
    amount: 0,
    currency: "usd",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/payments/payout/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to process payout");
      }

      setSuccess(true);
      // Refresh data or redirect as needed
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payout-container">
      <h2>Stripe Connect Payout</h2>
      {error && <div className="error-message">{error}</div>}
      {success && (
        <div className="success-message">Payout processed successfully!</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="stripe-amount">Amount</label>
          <input
            type="number"
            id="stripe-amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="stripe-currency">Currency</label>
          <select
            id="stripe-currency"
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            required
          >
            <option value="usd">USD</option>
            <option value="eur">EUR</option>
            <option value="gbp">GBP</option>
            <option value="cad">CAD</option>
            <option value="aud">AUD</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Send Payout"}
        </button>
      </form>

      <style jsx>{`
        .payout-container {
          max-width: 500px;
          margin: 2rem auto;
          padding: 1.5rem;
          border: 1px solid #eaeaea;
          border-radius: 8px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        h2 {
          margin-top: 0;
          color: #333;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        input,
        select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        button {
          background-color: #635bff;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        button:hover {
          background-color: #4a42d6;
        }
        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        .error-message {
          color: #d32f2f;
          margin-bottom: 1rem;
          padding: 0.5rem;
          background-color: #fdecea;
          border-radius: 4px;
        }
        .success-message {
          color: #388e3c;
          margin-bottom: 1rem;
          padding: 0.5rem;
          background-color: #ebf5eb;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
