"use client";

import Link from "next/link";
import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEmail } from "@/context/UserContext";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { useNotification } from "@/utils/notifications";

export default function Navbar2() {
  const router = useRouter();
  const { emailContext, setEmailContext } = useEmail();
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>(emailContext || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notification, showNotification } = useNotification();

  const fetchUserDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER}/getUserDetails`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
      toast.error("Error fetching user details.");
    }
  }, [emailContext]);

  useEffect(() => {
    if (emailContext) {
      fetchUserDetails();
      // Check if user is admin from user details
      const checkAdmin = async () => {
        try {
          const token = localStorage.getItem("token");
          if (token) {
            const response = await axios.get(
              `${process.env.NEXT_PUBLIC_SERVER}/getUserDetails`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            if (response.data.code === 0 && response.data.isAdmin) {
              setIsAdmin(true);
            }
          }
        } catch (error) {
          // Silently fail
        }
      };
      checkAdmin();
    }
  }, [emailContext, fetchUserDetails]);

  const handleAccountUpdate = async () => {
    if (!firstName || !lastName || !email) {
      toast.error("Please ensure all fields are filled.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/updateAccount`,
        {
          newFirstName: firstName,
          newLastName: lastName,
          newEmail: email,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200 && response.data.code === 0) {
        toast.success("Account updated successfully");
        // Store new JWT token if provided
        if (response.data.token) {
          localStorage.setItem("token", response.data.token);
          // Get email from backend using the new token
          try {
            const emailResponse = await axios.get(
              `${process.env.NEXT_PUBLIC_SERVER}/check-session`,
              {
                headers: {
                  Authorization: `Bearer ${response.data.token}`,
                },
              }
            );
            if (emailResponse.data.isAuthenticated) {
              setEmailContext(emailResponse.data.email);
            } else {
              setEmailContext(email);
            }
          } catch (err) {
            setEmailContext(email);
          }
        } else {
          setEmailContext(email);
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error("Error updating account.");
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-CSRF-Protection": "1",
          },
        }
      );
      if (response.status === 200) {
        localStorage.removeItem("cookieConsent");
        localStorage.removeItem("token");
        router.push("/");
      } else {
        toast.error("Error logging out.");
      }
    } catch (err) {
      // Even if logout fails, clear local storage
      localStorage.removeItem("token");
      router.push("/");
    }
  };

  const sendEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.current) return;

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please sign in to submit feedback");
      return;
    }

    const formData = new FormData(form.current);

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/contact`,
        { message: formData.get("message") },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const modal = document.getElementById(
        "report_modal"
      ) as HTMLDialogElement;
      if (modal) {
        modal.close();
      }

      toast.success("Report submitted successfully");
    } catch (error) {
      toast.error("Failed to submit the report");
    }
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

  return (
    <header className="bg-black border-b border-gray-800">
      <Toaster />
      <div className="relative py-3 sm:py-4 px-4 sm:px-6 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/dashboard" className="flex items-center">
          <span className="text-xl sm:text-3xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
              Feed
            </span>
            <span className="text-[#7FFFD4]">Recap</span>
          </span>
        </Link>

        <button
          type="button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 bg-[#111] text-[#7FFFD4] transition-colors hover:border-[#7FFFD4]/60 hover:bg-[#7FFFD4]/10 focus:outline-none focus:ring-2 focus:ring-[#7FFFD4]/50"
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18 18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 7h16M4 12h16M4 17h16"
              />
            )}
          </svg>
        </button>

        <nav
          ref={dropdownRef}
          className={`${
            menuOpen ? "flex" : "hidden"
          } absolute right-4 top-[calc(100%+0.5rem)] z-50 min-w-44 flex-col items-stretch gap-1 rounded-xl border border-gray-800 bg-[#111] p-2 shadow-xl md:static md:z-auto md:flex md:min-w-0 md:flex-row md:items-center md:gap-0 md:space-x-7 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          {isAdmin && (
            <Link
              href="/admin"
              className="text-[#7FFFD4] font-semibold w-full md:w-auto rounded-lg px-3 py-2 text-left md:px-0 md:py-0 md:text-center hover:bg-white/5 md:hover:bg-transparent hover:text-white transition-colors"
            >
              Admin
            </Link>
          )}
          <button
            className="text-[#7FFFD4] font-semibold w-full md:w-auto rounded-lg px-3 py-2 text-left md:px-0 md:py-0 md:text-center hover:bg-white/5 md:hover:bg-transparent hover:text-white transition-colors"
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
          {/* <button
            className="text-[#7FFFD4] font-semibold w-full md:w-auto rounded-lg px-3 py-2 text-left md:px-0 md:py-0 md:text-center hover:bg-white/5 md:hover:bg-transparent hover:text-white transition-colors"
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
          </button> */}
          <button
            className="text-[#7FFFD4] font-semibold w-full md:w-auto rounded-lg px-3 py-2 text-left md:px-0 md:py-0 md:text-center hover:bg-white/5 md:hover:bg-transparent hover:text-white transition-colors"
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
                onChange={(e) => setEmail(e.target.value)}
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
