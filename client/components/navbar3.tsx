import { useRouter } from "next/navigation";
import { useEmail } from "@/context/UserContext";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { useNotification } from "@/utils/notifications";
import { useRef, useState, useEffect, useCallback } from "react";

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
    } catch (error) {
      toast.error("Failed to update account.");
    }
  };

  return (
    <div>
      <Toaster />
      {/* existing navbar UI unchanged */}
    </div>
  );
}
