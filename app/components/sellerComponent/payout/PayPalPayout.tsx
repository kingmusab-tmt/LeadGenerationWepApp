"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface PayPalPayoutFormData {
  receiverEmail: string;
  amount: number;
  currency: string;
  note?: string;
}

export default function PayPalPayout() {
  const [formData, setFormData] = useState<PayPalPayoutFormData>({
    receiverEmail: "",
    amount: 0,
    currency: "USD",
    note: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
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
      const response = await fetch("/api/payouts/paypal", {
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
      <h2>PayPal Payout</h2>
      {error && <div className="error-message">{error}</div>}
      {success && (
        <div className="success-message">Payout processed successfully!</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="paypal-receiverEmail">Receiver Email</label>
          <input
            type="email"
            id="paypal-receiverEmail"
            name="receiverEmail"
            value={formData.receiverEmail}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="paypal-amount">Amount</label>
          <input
            type="number"
            id="paypal-amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="paypal-currency">Currency</label>
          <select
            id="paypal-currency"
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            required
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
            <option value="AUD">AUD</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="paypal-note">Note (Optional)</label>
          <textarea
            id="paypal-note"
            name="note"
            value={formData.note}
            onChange={handleChange}
            rows={3}
          />
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
        select,
        textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        textarea {
          resize: vertical;
        }
        button {
          background-color: #0070ba;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        button:hover {
          background-color: #005ea6;
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
