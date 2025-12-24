"use client";
import axios from "axios";
import React, { useState, useRef, type KeyboardEvent } from "react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { Eye, Mail, Lock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEmail } from "@/context/UserContext";
import Navbar from "@/components/navbar";

const Signup: React.FC = () => {
  const [flag, setFlag] = useState(true);
  const [firstName, setFirstName] = useState("User");
  const [lastName, setLastName] = useState("User");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [load, setLoad] = useState(false);
  const [formErrors, setFormErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { setEmailContext } = useEmail();

  // Helper function to get email from backend using token
  const getEmailFromBackend = async (token: string): Promise<string | null> => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER}/check-session`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.data.isAuthenticated) {
        return response.data.email;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  React.useEffect(() => {
    const checkParams = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const message = params.get("message");
      const jwtToken = params.get("token");
      if (code) {
        if (Number.parseInt(code) === 0 && jwtToken) {
          // Store JWT token
          localStorage.setItem("token", jwtToken);
          // Get email from backend
          const email = await getEmailFromBackend(jwtToken);
          if (email) {
            setEmailContext(email);
            router.push("/dashboard");
          }
        }
      }
    };
    checkParams();
  }, [router, setEmailContext]);

  React.useEffect(() => {
    const storage = async () => {
      const savedToken = localStorage.getItem("token");
      if (savedToken) {
        const email = await getEmailFromBackend(savedToken);
        if (email) {
          setEmailContext(email);
          router.push("/dashboard");
        } else {
          // Invalid token, remove it
          localStorage.removeItem("token");
        }
      }
    };
    storage();
  }, [router, setEmailContext]);

  const handleOtpChange = (index: number, value: string) => {
    if (/^[0-9]$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Backspace") {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  async function emailAlreadyExist() {
    try {
      const result = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER}/validateEmail`,
        {
          params: { email: email },
        }
      );
      // Email exists if status is 200, doesn't exist if status is 404
      return result.status === 200;
    } catch (err) {
      return false;
    }
  }

  const validateForm = async () => {
    const errors = {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    };
    let isValid = true;

    if (!firstName) {
      errors.firstName = "First name is required";
      isValid = false;
    }
    if (!lastName) {
      errors.lastName = "Last name is required";
      isValid = false;
    }
    if (!email) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Not a valid email";
      isValid = false;
    } else if (await emailAlreadyExist()) {
      errors.email = "Email already registered";
      isValid = false;
    }
    if (!password) {
      errors.password = "Password is required";
      isValid = false;
    } else if (
      password.length < 8 ||
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      errors.password =
        "Password must be at least 8 characters long and include a letter and a number";
      isValid = false;
    }
    setFormErrors(errors);
    return isValid;
  };

  const handleSignup = async () => {
    if (await validateForm()) {
      generateOtp();
      setFlag(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otp.includes("")) {
      setOtpError(true);
    } else {
      setOtpError(false);

      if (generatedOtp === otp.join("")) {
        try {
          // setLoad(true);
          const result = await axios.post(
            `${process.env.NEXT_PUBLIC_SERVER}/register`,
            {
              firstName,
              lastName,
              email,
              password,
            }
          );

          if (result.status === 201 && result.data.code === 0) {
            // Store JWT token in localStorage
            if (result.data.token) {
              localStorage.setItem("token", result.data.token);
              // Get email from backend using the token
              const emailFromBackend = await getEmailFromBackend(
                result.data.token
              );
              if (emailFromBackend) {
                setEmailContext(emailFromBackend);
              } else if (result.data.email) {
                // Fallback to email from response if backend check fails
                setEmailContext(result.data.email);
              } else {
                setEmailContext(email);
              }
            }
            router.push("/dashboard");
          } else {
            toast.error("Server error");
          }
        } catch (error: any) {
          if (error.response?.status === 409) {
            toast.error("User already exists");
          } else {
            toast.error("An error occurred during signup");
          }
        }
      } else {
        setVerified(true);
        setTimeout(() => {
          setVerified(false);
        }, 3000);
      }
    }
  };

  const generateOtp = async () => {
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/sentOTP`,
        {
          email: email,
        }
      );
      setGeneratedOtp(result.data.otp);
    } catch (error) {
      console.error(error);
      toast.error("Error generating OTP");
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="container mx-auto px-4 py-10 md:py-32">
        <div className="max-w-md mx-auto">
          <Toaster />
          <div className="bg-[#111] rounded-xl border border-gray-800 p-8 shadow-xl">
            <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
              Sign Up
            </h1>

            {flag && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      className={`w-full bg-black border ${
                        formErrors.email ? "border-red-500" : "border-gray-700"
                      } rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7FFFD4] transition-colors`}
                      placeholder="Enter your email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  {formErrors.email && (
                    <p className="text-sm text-red-500 mt-1">
                      {formErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`w-full bg-black border ${
                        formErrors.password
                          ? "border-red-500"
                          : "border-gray-700"
                      } rounded-lg pl-10 pr-10 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7FFFD4] transition-colors`}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <Eye className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="text-sm text-red-500 mt-1">
                      {formErrors.password}
                    </p>
                  )}
                </div>

                <button
                  className="w-full bg-gradient-to-r from-[#7FFFD4] to-[#00CED1] text-black font-medium py-2 rounded-lg hover:opacity-90 transition-opacity"
                  onClick={handleSignup}
                >
                  Sign Up
                </button>

                <div className="text-center text-sm text-gray-400">
                  Already have an account?{" "}
                  <Link
                    href="/signin"
                    className="text-[#7FFFD4] hover:text-[#00CED1] transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            )}

            {!flag && (
              <div className="space-y-4">
                <p className="text-sm text-gray-300">
                  Please enter the 6-digit OTP sent to your email
                </p>
                <div className="flex justify-between">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      value={digit}
                      className={`w-10 h-10 text-center text-white bg-black border ${
                        otpError && !digit
                          ? "border-red-500"
                          : "border-gray-700"
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7FFFD4] transition-colors`}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                    />
                  ))}
                </div>

                {verified && <p className="text-sm text-red-500">Wrong OTP</p>}

                <button
                  className="w-full bg-gradient-to-r from-[#7FFFD4] to-[#00CED1] text-black font-medium py-2 rounded-lg hover:opacity-90 transition-opacity"
                  onClick={handleOtpVerify}
                >
                  {load ? (
                    <span className="loading loading-spinner loading-md"></span>
                  ) : (
                    "Verify"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* <Footer /> */}
    </div>
  );
};

export default Signup;
