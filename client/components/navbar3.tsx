"use client";
import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEmail } from "@/context/UserContext";
import axios from "axios";
import emailjs from "@emailjs/browser";
import { Toaster, toast } from "react-hot-toast";

export default function Navbar2() {
  const router = useRouter();
  const { emailContext, setEmailContext } = useEmail();
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>(emailContext || "");
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    console.log(form);
  }, [form]);

  useEffect(() => {
    if (emailContext) {
      fetchUserDetails();
    }
  }, [emailContext]);

  const fetchUserDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER}/getUserDetails`,
        { params: { email: emailContext } }
      );
      if (response.data.code === 0) {
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

      if (response.data.code === 0) {
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
      if (response.data.code === 0) {
        toast.success("Logged out successfully.");
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

    console.log(form.current);
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

  return (
    <header className="shadow-md bg-base-300 rounded-b-xl">
      <Toaster />
      <div className="py-4 px-6 flex">
        <Link className="text-xl font-bold text-gray-800 flex-grow" href="/">
          FeedRecap
        </Link>
        <nav className="space-x-4 buttonss">
          <button
            className="text-gray-800 font-semibold"
            onClick={() => {
              const modal = document.getElementById(
                "report_modal"
              ) as HTMLDialogElement;
              if (modal) {
                modal.showModal();
              }
            }}
          >
            Report a Problem
          </button>
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
          <button
            className="text-gray-800 font-semibold"
            onClick={handleLogout}
          >
            Logout
          </button>
        </nav>
      </div>

      {/* Account Modal */}
      <dialog id="account_modal" className="bg-white p-6 rounded-lg max-w-lg">
        <h2 className="text-xl font-bold mb-4">&nbsp;Update Account</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              &nbsp;First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="First Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              &nbsp;Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Last Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              &nbsp;Email
            </label>
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

      {/* Report Problem Modal */}
      <dialog id="report_modal" className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
              ✕
            </button>
          </form>
          <form ref={form} onSubmit={sendEmail}>
            <label className="block text-left mb-2">Name</label>
            <input
              type="text"
              name="user_name"
              className="input input-bordered w-full mb-4"
              required
            />
            <label className="block text-left mb-2">Email</label>
            <input
              type="email"
              name="user_email"
              className="input input-bordered w-full mb-4"
              required
            />
            <label className="block text-left mb-2">Message</label>
            <textarea
              name="message"
              className="textarea textarea-bordered w-full mb-4"
              required
            ></textarea> 
            <button className="btn btn-primary w-full mt-2" type="submit">
              Submit Report
            </button>
          </form>
        </div>
      </dialog>
    </header>
  );
}
