import type React from "react";
import { useRef } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

export default function Footer() {
  const form = useRef<HTMLFormElement>(null);

  const sendEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.current) return;

    const formEl = form.current;
    const name = (formEl.elements.namedItem("user_name") as HTMLInputElement)
      ?.value;
    const email = (formEl.elements.namedItem("user_email") as HTMLInputElement)
      ?.value;
    const message = (formEl.elements.namedItem("message") as HTMLTextAreaElement)
      ?.value;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/contact`,
        { name, email, message },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );

      toast.success("Email sent successfully");
      // Close modal if open
      const modal = document.getElementById("contact_modal") as HTMLDialogElement;
      if (modal) modal.close();
    } catch (error) {
      console.error("Failed to send contact message", error);
      toast.error("Failed to send email");
    }
  };

  return (
    <div>
      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-[#7FFFD4] font-semibold">
              &copy; {new Date().getFullYear()} FeedRecap. All rights reserved
            </p>
          </div>
          <nav className="space-x-6">
            <button
              className="text-white hover:text-[#7FFFD4] transition-colors"
              onClick={() => {
                const modal = document.getElementById(
                  "contact_modal"
                ) as HTMLDialogElement;
                if (modal) {
                  modal.showModal();
                }
              }}
            >
              Contact Us
            </button>
          </nav>
        </div>
      </footer>

      <Toaster />

      {/* Contact Modal */}
      <dialog
        id="contact_modal"
        className="modal p-4 rounded-lg bg-[#111] border border-gray-800 text-white"
      >
        <div className="modal-box bg-[#111] p-6 w-full max-w-md mx-auto">
          <form method="dialog" className="absolute right-2 top-2">
            <button className="text-gray-400 hover:text-white transition-colors">
              ✕
            </button>
          </form>
          <h3 className="font-bold text-lg mb-4 text-[#7FFFD4]">Contact Us</h3>
          <form ref={form} onSubmit={sendEmail} className="space-y-4">
            <div>
              <label className="block text-left mb-2 text-gray-300">Name</label>
              <input
                type="text"
                name="user_name"
                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7FFFD4] text-white"
                required
              />
            </div>
            <div>
              <label className="block text-left mb-2 text-gray-300">Email</label>
              <input
                type="email"
                name="user_email"
                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7FFFD4] text-white"
                required
              />
            </div>
            <div>
              <label className="block text-left mb-2 text-gray-300">Message</label>
              <textarea
                name="message"
                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7FFFD4] text-white h-32"
                required
              />
            </div>
            <div className="text-right">
              <button
                type="submit"
                className="px-4 py-2 bg-[#7FFFD4] text-black rounded-md font-semibold"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
