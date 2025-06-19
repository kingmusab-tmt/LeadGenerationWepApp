"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface StripeAccountStatus {
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  tosAccepted: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
  };
}

export default function StripeOnboarding({ userEmail }: { userEmail: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] =
    useState<StripeAccountStatus | null>(null);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const router = useRouter();

  // Check account status on component mount
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/stripeapi/account-status?email=${encodeURIComponent(userEmail)}`
        );
        const data = await response.json();

        if (response.ok) {
          setAccountStatus(data);
          setAccountId(data.accountId);
        }
      } catch (err) {
        console.error("Failed to check account status:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      checkInitialStatus();
    }

    // Handle onboarding redirects
    const query = new URLSearchParams(window.location.search);
    const onboardingStatus = query.get("stripe_onboarding");
    const accountId = query.get("account_id");

    if (onboardingStatus === "success") {
      setAccountId(accountId);
      checkInitialStatus();
      router.replace(window.location.pathname);
    } else if (onboardingStatus === "restart") {
      setError("Onboarding was interrupted - please try again");
      setAccountId(accountId);
      router.replace(window.location.pathname);
    }
  }, [userEmail]);

  const createConnectedAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripeapi/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: { email: userEmail } }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create account");
      }

      setAccountId(data.accountId);
      setOnboardingUrl(data.onboardingUrl);
      window.location.href = data.onboardingUrl;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const getRequirementLabel = (requirement: string) => {
    const labels: Record<string, string> = {
      "individual.ssn_last_4": "Last 4 digits of your SSN",
      "individual.id_number": "Government-issued ID number",
    };
    return labels[requirement] || requirement;
  };

  const renderRequirements = () => {
    if (!accountStatus) return null;

    const hasOutstandingRequirements =
      accountStatus.requirements.currentlyDue.length > 0 ||
      accountStatus.requirements.pastDue.length > 0;

    if (!hasOutstandingRequirements) {
      return (
        <div className="success-message">
          Your account is fully set up and ready to receive payments!
        </div>
      );
    }

    return (
      <div className="requirements">
        <h3>Additional Information Required</h3>
        <p>
          Your account is partially set up, but we need more information to
          enable payments:
        </p>

        {accountStatus.requirements.currentlyDue.length > 0 && (
          <div className="requirement-section">
            <h4>Immediately Required:</h4>
            <ul>
              {accountStatus.requirements.currentlyDue.map((req, i) => (
                <li key={`current-${i}`}>{getRequirementLabel(req)}</li>
              ))}
            </ul>
          </div>
        )}

        {accountStatus.requirements.pastDue.length > 0 && (
          <div className="requirement-section">
            <h4>Past Due:</h4>
            <ul>
              {accountStatus.requirements.pastDue.map((req, i) => (
                <li key={`past-${i}`}>{getRequirementLabel(req)}</li>
              ))}
            </ul>
          </div>
        )}

        {accountStatus.requirements.eventuallyDue.length > 0 && (
          <div className="requirement-section">
            <h4>Future Requirements:</h4>
            <ul>
              {accountStatus.requirements.eventuallyDue.map((req, i) => (
                <li key={`eventual-${i}`}>{getRequirementLabel(req)}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={() => {
            if (!onboardingUrl) {
              createConnectedAccount();
            } else {
              window.location.href = onboardingUrl;
            }
          }}
          disabled={loading}
          className="complete-button"
        >
          {loading ? "Loading..." : "Provide Missing Information"}
        </button>
      </div>
    );
  };

  const renderAccountStatus = () => {
    if (!accountStatus) return null;

    return (
      <div className="status-summary">
        <div className="status-item">
          <strong>Account Status:</strong>{" "}
          {accountStatus.chargesEnabled && accountStatus.payoutsEnabled
            ? "Fully Connected"
            : "Partially Connected"}
        </div>
        <div className="status-item">
          <strong>Payments Enabled:</strong>{" "}
          {accountStatus.chargesEnabled ? "Yes" : "No"}
        </div>
        <div className="status-item">
          <strong>Payouts Enabled:</strong>{" "}
          {accountStatus.payoutsEnabled ? "Yes" : "No"}
        </div>
        <div className="status-item">
          <strong>TOS Accepted:</strong>{" "}
          {accountStatus.tosAccepted ? "Yes" : "No"}
        </div>
      </div>
    );
  };

  return (
    <div className="onboarding-container">
      <h2>Stripe Connect Onboarding</h2>
      <p>Connect your Stripe account to start receiving payments.</p>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-message">Loading account status...</div>
      ) : accountStatus ? (
        <>
          {renderAccountStatus()}
          {renderRequirements()}
        </>
      ) : (
        <div className="initial-setup">
          <p>You need to connect your Stripe account to receive payments.</p>
          <button
            onClick={createConnectedAccount}
            disabled={loading}
            className="connect-button"
          >
            {loading ? "Creating Account..." : "Connect with Stripe"}
          </button>
        </div>
      )}

      <style jsx>{`
        .onboarding-container {
          max-width: 600px;
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
        .error-message {
          color: #d32f2f;
          margin: 1rem 0;
          padding: 0.75rem;
          background-color: #fdecea;
          border-radius: 4px;
          border-left: 4px solid #d32f2f;
        }
        .success-message {
          color: #388e3c;
          margin: 1rem 0;
          padding: 0.75rem;
          background-color: #ebf5eb;
          border-radius: 4px;
          border-left: 4px solid #388e3c;
        }
        .loading-message {
          color: #666;
          padding: 1rem;
          text-align: center;
        }
        .status-summary {
          margin: 1.5rem 0;
          padding: 1rem;
          background-color: #f8f9fa;
          border-radius: 4px;
        }
        .status-item {
          margin-bottom: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #eee;
        }
        .status-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .requirements {
          margin: 1.5rem 0;
        }
        .requirement-section {
          margin-bottom: 1.5rem;
        }
        .requirement-section h4 {
          margin-bottom: 0.5rem;
          color: #555;
        }
        .requirement-section ul {
          margin: 0.5rem 0 1rem 1.5rem;
          padding: 0;
        }
        .requirement-section li {
          margin-bottom: 0.25rem;
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
          margin-top: 1rem;
          display: inline-block;
        }
        button:hover {
          background-color: #4a42d6;
        }
        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        .connect-button {
          background-color: #635bff;
        }
        .complete-button {
          background-color: #00a86b;
        }
        .complete-button:hover {
          background-color: #008a5a;
        }
        .initial-setup {
          margin: 1.5rem 0;
          padding: 1rem;
          background-color: #f0f7ff;
          border-radius: 4px;
          border-left: 4px solid #635bff;
        }
      `}</style>
    </div>
  );
}
