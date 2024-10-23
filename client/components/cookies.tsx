import { useEffect } from "react";
import axios from "axios";
import "./cookies.css"

function CookieConsent() {
  useEffect(() => {
    const localConsent = localStorage.getItem("cookieConsent");
    if (localConsent !== null) {
      return;
    }

    const fetchConsent = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER}/getCookieConsent`,
          { withCredentials: true }
        );
        if (response.data.consent === undefined) {
          const dialog = document.getElementById("cookie-modal");
          if (dialog) {
            dialog.style.display = "block";
          }
        }
      } catch (error) {
        console.error("Error fetching cookie consent:", error);
      }
    };
    fetchConsent();
  }, []);

  const handleAccept = async () => {
    localStorage.setItem("cookieConsent", "true");
    await updateCookieConsent(true);
    const dialog = document.getElementById("cookie-modal");
    if (dialog) {
      dialog.style.display = "none";
    }
  };

  const handleDecline = async () => {
    localStorage.setItem("cookieConsent", "false");
    await updateCookieConsent(false);
    const dialog = document.getElementById("cookie-modal");
    if (dialog) {
      dialog.style.display = "none";
    }
  };

  const updateCookieConsent = async (consent: boolean) => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateCookieConsent`,
        { consent },
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Error updating cookie consent:", error);
    }
  };

  return (
    <div id="cookie-modal" className="modal20">
      <div className="modalBox20">
        <p>
          We use cookies to improve your experience on our site
        </p>
        <div className="buttons20">
          <button className="acceptBtn20" onClick={handleAccept}>
            Accept
          </button>
          <button className="declineBtn20" onClick={handleDecline}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsent;
