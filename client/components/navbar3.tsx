"use client";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEmail } from "@/context/UserContext"; // Assuming you're using a context for email
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";

export default function Navbar2() {
  const router = useRouter();
  const { emailContext, setEmailContext } = useEmail(); // Assuming you're using this from context
  const [firstName, setFirstName] = useState<string>(""); // Ensure it initializes as an empty string
  const [lastName, setLastName] = useState<string>(""); // Ensure it initializes as an empty string
  const [email, setEmail] = useState<string>(emailContext || ""); // Initialize with the context email or empty string

  // Fetch user details on load
  useEffect(() => {
    if (emailContext) {
      fetchUserDetails();
    }
  }, [emailContext]);

  // Fetch user details from backend and populate the form
  const fetchUserDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER}/getUserDetails`,
        { params: { email: emailContext } }
      );
      if (response.data.code === 0) {
        setFirstName(response.data.firstName || ""); // Set to empty string if undefined
        setLastName(response.data.lastName || ""); // Set to empty string if undefined
        setEmail(emailContext); // Email already available from context
      } else {
        toast.error("Error fetching user details.");
      }
    } catch (err) {
      console.log("Error fetching user details:", err);
      toast.error("Error fetching user details.");
    }
  };

  // Handle account update logic
  const handleAccountUpdate = async () => {
    // Check if all fields are valid before sending the update request
    if (!firstName || !lastName || !email) {
      toast.error("Please ensure all fields are filled.");
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateAccount`,
        {
          email: emailContext, // Old email to identify the user
          newFirstName: firstName,
          newLastName: lastName,
          newEmail: email, // The updated email (can be the same or changed)
        }
      );

      if (response.data.code == 0) {
        toast.success("Account updated successfully");
        setEmailContext(email); // Update email context if email changes
        localStorage.setItem("email", email); // Update localStorage email
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      console.log(err);
      toast.error("Error updating account.");
    }
  };

  // Handle logout logic
  const handleLogout = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/logout`,
        {},
        { withCredentials: true }
      );
      if (response.data.code === 0) {
        toast.success("Logged out successfully.");
        // Clear localStorage items like cookieConsent
        localStorage.removeItem("cookieConsent");
        localStorage.removeItem("email");
        router.push("/");
      } else {
        toast.error("Error logging out.");
      }
    } catch (err) {
      console.log("Error during logout:", err);
      toast.error("Error logging out.");
    }
  };

  return (
    <header className="shadow-md bg-base-300 rounded-b-xl">
      <Toaster />
      <div className="py-4 px-6 flex">
        <Link className="text-xl font-bold text-gray-800 flex-grow" href="/">
          FeedRecap{" "}
        </Link>
        <nav className="space-x-4 buttonss">
          {/* Account button opens the account modal */}
          <button
            className="text-gray-800 font-semibold"
            onClick={() => {
              const modal = document.getElementById(
                "account_modal"
              ) as HTMLDialogElement;
              if (modal) {
                modal.showModal();
              }
            }}
          >
            Account
          </button>

          {/* Logout button */}
          <button
            className="text-gray-800 font-semibold"
            onClick={handleLogout}
          >
            Logout
          </button>

          {/* Contact Us button (unchanged) */}
          <button
            onClick={() => {
              const modal = document.getElementById(
                "contact_modal"
              ) as HTMLDialogElement;
              if (modal) {
                modal.showModal();
              }
            }}
            className="text-gray-800 font-semibold"
          >
            Contact Us
          </button>
        </nav>
      </div>

      {/* Account Modal */}
      <dialog id="account_modal" className="bg-white p-6 rounded-lg max-w-lg">
        <h2 className="text-xl font-bold mb-4">Update Account</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="First Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Last Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Email"
            />
          </div>
        </div>
        <div className="mt-6 space-x-4">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleAccountUpdate}
          >
            Update Account
          </button>
          <button
            className="bg-gray-400 text-white px-4 py-2 rounded"
            onClick={() => {
              const modal = document.getElementById(
                "account_modal"
              ) as HTMLDialogElement;
              if (modal) {
                modal.close();
              }
            }}
          >
            Close
          </button>
        </div>
      </dialog>

      {/* Contact Modal (unchanged) */}
      <dialog id="contact_modal" className="bg-white p-6 rounded-lg max-w-lg">
        <h2 className="text-xl font-bold mb-4">Contact Us</h2>
        <p>For any queries, please contact us at: support@feedrecap.com</p>
        <button
          className="bg-gray-400 text-white px-4 py-2 rounded mt-4"
          onClick={() => {
            const modal = document.getElementById(
              "contact_modal"
            ) as HTMLDialogElement;
            if (modal) {
              modal.close();
            }
          }}
        >
          Close
        </button>
      </dialog>
    </header>
  );
}
