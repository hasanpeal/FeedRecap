"use client";

import Link from "next/link";
import type React from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEmail } from "@/context/UserContext";
import axios from "axios";
import emailjs from "@emailjs/browser";
import { Toaster, toast } from "react-hot-toast";
import { useNotification } from "@/utils/notifications";

export default function Navbar2() {
  const router = useRouter();
  const { emailContext, setEmailContext } = useEmail();
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>(emailContext || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notification, showNotification } = useNotification();

  useEffect(() => {
    if (emailContext) {
      fetchUserDetails();
    }
  }, [emailContext]);

  const fetchUserDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER}/getUserDetails`,
        {
          params: { email: emailContext },
        }
      );
      if (response.status === 200) {
        setFirstName(response.data.firstName || "");
        setLastName(response.data.lastName || "");
        setEmail(emailContext);
      } else {
        toast.error("Error fetching user details.");
      }
    } catch (err) {
      console.error("Error fetching user details:", err);
      toast.error("Error fetching user details.");
    }
  };

  const handleAccountUpdate = async () => {
    if (!firstName || !lastName || !email) {
      toast.error("Please ensure all fields are filled.");
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateAccount`,
        {
          email: emailContext,
          newFirstName: firstName,
          newLastName: lastName,
          newEmail: email,
        }
      );

      if (response.status === 200) {
        toast.success("Account updated successfully");
        setEmailContext(email);
        localStorage.setItem("email", email);
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating account.");
    }
  };

  const handleLogout = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/logout`,
        {},
        { withCredentials: true }
      );
      if (response.status === 200) {
        localStorage.removeItem("cookieConsent");
        localStorage.removeItem("email");
        router.push("/");
      } else {
        toast.error("Error logging out.");
      }
    } catch (err) {
      console.error("Error during logout:", err);
      toast.error("Error logging out.");
    }
  };

  const sendEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.current) return;

    const modal = document.getElementById("report_modal") as HTMLDialogElement;
    if (modal) {
      modal.close();
    }

    emailjs
      .sendForm(
        process.env.NEXT_PUBLIC_SERVICE_ID || "",
        process.env.NEXT_PUBLIC_TEMPLATE_ID || "",
        form.current,
        process.env.NEXT_PUBLIC_PUBLIC_KEY || ""
      )
      .then(
        () => {
          toast.success("Report submitted successfully");
        },
        (error) => {
          console.error("Error sending email:", error.text);
          toast.error("Failed to submit the report");
        }
      );
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("click", handleOutsideClick);
    } else {
      document.removeEventListener("click", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [menuOpen]);

  function handleReload() {
    window.location.reload();
  }

  return (
    <header className="bg-black border-b border-gray-800">
      <Toaster />
      <div className="py-4 px-6 flex items-center justify-between max-w-7xl mx-auto">
        <Link
          href="/dashboard"
          className="flex items-center"
          onClick={handleReload}
        >
          <span className="text-3xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
              Feed
            </span>
            <span className="text-[#7FFFD4]">Recap</span>
          </span>
        </Link>

        {menuOpen || (
          <button
            className="md:hidden text-[#7FFFD4]"
            onClick={() => setMenuOpen(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </button>
        )}

        <nav
          ref={dropdownRef}
          className={`${
            menuOpen ? "block bg-black" : "hidden"
          } md:flex md:bg-transparent md:shadow-none flex-col md:flex-row items-center md:space-x-7 space-y-2 md:space-y-0 p-4 md:p-0 rounded md:rounded-none shadow md:shadow-none`}
        >
          <button
            className="text-[#7FFFD4] font-semibold w-full md:w-auto text-left md:text-center hover:text-white transition-colors"
            onClick={() => {
              const modal = document.getElementById(
                "report_modal"
              ) as HTMLDialogElement;
              if (modal) {
                modal.showModal();
              }
            }}
          >
            Feedback
          </button>
          <button
            className="text-[#7FFFD4] font-semibold w-full md:w-auto text-left md:text-center hover:text-white transition-colors"
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
          <button
            className="text-[#7FFFD4] font-semibold w-full md:w-auto text-left md:text-center hover:text-white transition-colors"
            onClick={handleLogout}
          >
            Logout
          </button>
        </nav>
      </div>

      {/* Account Modal */}
      <dialog
        id="account_modal"
        className="bg-[#111] p-6 rounded-lg max-w-lg text-white"
      >
        <h2 className="text-xl font-bold mb-4 text-[#7FFFD4]">
          Update Account
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded bg-black text-white border-gray-700 focus:border-[#7FFFD4] focus:outline-none"
              placeholder="Email"
            />
          </div>
        </div>
        <div className="mt-6 space-x-4">
          <button
            className="bg-[#7FFFD4] text-black px-4 py-2 rounded hover:bg-[#00CED1] transition-colors"
            onClick={handleAccountUpdate}
          >
            Update Account
          </button>
          <button
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
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

      {/* Report Modal */}
      <dialog
        id="report_modal"
        className="bg-[#111] p-6 rounded-lg max-w-lg text-white"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#7FFFD4]">Feedback</h2>
          <button
            className="text-[#7FFFD4] font-bold text-lg hover:text-white transition-colors"
            onClick={() => {
              const modal = document.getElementById(
                "report_modal"
              ) as HTMLDialogElement;
              if (modal) {
                modal.close();
              }
            }}
          >
            &times;
          </button>
        </div>
        <form ref={form} onSubmit={sendEmail}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                name="user_name"
                defaultValue={firstName + " " + lastName}
                className="w-full p-2 border rounded bg-black text-white border-gray-700 focus:border-[#7FFFD4] focus:outline-none"
                placeholder="Your Name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                name="user_email"
                value={email}
                className="w-full p-2 border rounded bg-black text-white border-gray-700 focus:border-[#7FFFD4] focus:outline-none"
                placeholder="Your Email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea
                name="message"
                className="w-full p-2 border rounded bg-black text-white border-gray-700 focus:border-[#7FFFD4] focus:outline-none"
                placeholder="Your Message"
                required
              ></textarea>
            </div>
          </div>
          <div className="mt-6">
            <button
              type="submit"
              className="bg-[#7FFFD4] text-black px-4 py-2 rounded hover:bg-[#00CED1] transition-colors w-full"
            >
              Submit Report
            </button>
          </div>
        </form>
      </dialog>
    </header>
  );
}
