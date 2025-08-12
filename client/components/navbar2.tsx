"use client";

import Link from "next/link";
import type React from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEmail } from "@/context/UserContext";
import axios from "axios";
import emailjs from "@emailjs/browser";
import { useNotification } from "@/utils/notifications";

export default function Navbar2() {
  const router = useRouter();
  const { emailContext, setEmailContext } = useEmail();
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>(emailContext || "");
  const [message, setMessage] = useState<string>("");
  const form = useRef<HTMLFormElement>(null);
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
        showNotification("Error fetching user details.", "error");
      }
    } catch (err) {
      console.error("Error fetching user details:", err);
      showNotification("Error fetching user details.", "error");
    }
  };

  const sendEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.current) return;

    const modal = document.getElementById("contact_modal") as HTMLDialogElement;
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
          showNotification("Message sent successfully", "success");
          setMessage(""); // Clear the message field after sending
        },
        (error) => {
          console.error("Error sending email:", error.text);
          showNotification("Failed to send the message", "error");
        }
      );
  };

  return (
    <header className="bg-black border-b border-gray-800">
      {notification && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-lg ${
            notification.type === "success"
              ? "bg-[#7FFFD4] text-black"
              : "bg-red-500 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}
      <div className="py-4 px-6 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center">
          <span className="text-3xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
              Feed
            </span>
            <span className="text-[#7FFFD4]">Recap</span>
          </span>
        </Link>

        <nav className="hidden md:flex space-x-4 items-center">
          <Link href="/aboutus">
            <button className="text-[#7FFFD4] font-semibold hover:text-white transition-colors">
              About Us
            </button>
          </Link>
          <button
            onClick={() => {
              const modal = document.getElementById(
                "contact_modal"
              ) as HTMLDialogElement;
              if (modal) {
                modal.showModal();
              }
            }}
            className="text-[#7FFFD4] font-semibold hover:text-white transition-colors"
          >
            Contact Us
          </button>
        </nav>
      </div>

      {/* Contact Modal */}
      <dialog
        id="contact_modal"
        className="bg-[#111] p-6 rounded-lg max-w-lg text-white"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#7FFFD4]">Contact Us</h2>
          <button
            className="text-[#7FFFD4] font-bold text-lg hover:text-white transition-colors"
            onClick={() => {
              const modal = document.getElementById(
                "contact_modal"
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
                value={`${firstName} ${lastName}`}
                onChange={(e) => {
                  const [newFirstName, ...newLastName] =
                    e.target.value.split(" ");
                  setFirstName(newFirstName);
                  setLastName(newLastName.join(" "));
                }}
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
                value={message}
                onChange={(e) => setMessage(e.target.value)}
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
              Submit
            </button>
          </div>
        </form>
      </dialog>
    </header>
  );
}
