"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import axios from "axios";
import Link from "next/link";
import { Eye, Mail, Lock } from "lucide-react";
import { useEmail } from "@/context/UserContext";
import Navbar2 from "@/components/navbar2";

export default function Signin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forget, setForget] = useState(true);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [passFlag, setPassFlag] = useState(false);
  const [verified, setVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [load, setLoad] = useState(false);
  const [load2, setLoad2] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [username, setUserName] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [formErrors, setFormErrors] = useState({
    email: "",
    password: "",
  });
  const [emailErrors, setEmailErrors] = useState({
    email: "",
  });
  const [newPasswordError, setNewPasswordError] = useState({
    confirmPassword: "",
    nPass: "",
    cnPass: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [showPassword3, setShowPassword3] = useState(false);

  const form = useRef<HTMLFormElement>(null);
  const { setEmailContext } = useEmail();
  const router = useRouter();

  React.useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER}/check-session`,
          { withCredentials: true }
        );
        if (response.data.isAuthenticated) {
          const { email } = response.data;
          setEmailContext(email);
          router.push("/dashboard");
        }
      } catch (error) {
        console.error(error);
      }
    };
    checkSession();
  }, [router, setEmailContext]);

  React.useEffect(() => {
    const checkParams = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const message = params.get("message");
      const capturedEmail = params.get("email");
      if (code) {
        if (Number.parseInt(code) === 0) {
          setEmailContext(capturedEmail || "");
          router.push("/dashboard");
        } else {
          setFormErrors((prev) => ({
            ...prev,
            password: message || "Authentication failed",
          }));
          setTimeout(
            () => setFormErrors((prev) => ({ ...prev, password: "" })),
            3000
          );
        }
      }
    };
    checkParams();
  }, [router, setEmailContext]);

  React.useEffect(() => {
    const storage = async () => {
      const savedEmail = localStorage.getItem("email");
      if (savedEmail) {
        setEmailContext(savedEmail);
        router.push("/dashboard");
      }
    };
    storage();
  }, [router, setEmailContext]);

  async function emailDoesntExist() {
    try {
      const result = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER}/validateEmail`,
        {
          params: { email: email },
        }
      );
      // Email doesn't exist if status is 404, exists if status is 200
      return result.status === 404;
    } catch (err) {
      return true;
    }
  }

  const handleLogin = async () => {
    if (await validateForm()) {
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_SERVER}/login`,
          {
            email,
            password,
          }
        );
        if (result.status === 200) {
          setEmailContext(email);
          router.push("/dashboard");
        } else {
          setFormErrors((prev) => ({
            ...prev,
            password: "Invalid email or password",
          }));
          setTimeout(
            () => setFormErrors((prev) => ({ ...prev, password: "" })),
            3000
          );
        }
      } catch (err: any) {
        console.error("Error in handleLogin function in Login.tsx");
        if (err.response?.status === 401) {
          setFormErrors((prev) => ({
            ...prev,
            password: err.response.data.message || "Invalid email or password",
          }));
        } else {
          setFormErrors((prev) => ({
            ...prev,
            password: "An error occurred. Please try again.",
          }));
        }
        setTimeout(
          () => setFormErrors((prev) => ({ ...prev, password: "" })),
          3000
        );
      }
    } else {
      setTimeout(() => {
        setFormErrors({
          email: "",
          password: "",
        });
      }, 3000);
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
    } catch (error) {}
  };

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

  const validateForm = async () => {
    const errors = {
      email: "",
      password: "",
    };
    let isValid = true;

    if (!email) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Not a valid email";
      isValid = false;
    } else if (await emailDoesntExist()) {
      errors.email = "Email isn't registered";
      isValid = false;
    }
    if (!password) {
      errors.password = "Password is required";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  async function validateEmail() {
    const errors = {
      email: "",
    };
    let isValid = true;
    if (!email) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Not a valid email";
      isValid = false;
    } else {
      const exist = await emailDoesntExist();
      if (exist) {
        errors.email = "Email isn't registered";
        isValid = false;
      }
    }
    setEmailErrors(errors);
    return isValid;
  }

  function validateNewPassword() {
    const errors = {
      confirmPassword: "",
      nPass: "",
      cnPass: "",
    };
    let isValid = true;

    if (!newPassword) {
      errors.nPass = "Password is required";
      isValid = false;
    } else if (
      newPassword.length < 8 ||
      !/[a-zA-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      errors.nPass =
        "Password must be at least 8 characters long and include a letter and a number";
      isValid = false;
    }

    if (!confirmNewPassword) {
      errors.cnPass = "Password is required";
      isValid = false;
    } else if (
      confirmNewPassword.length < 8 ||
      !/[a-zA-Z]/.test(confirmNewPassword) ||
      !/[0-9]/.test(confirmNewPassword)
    ) {
      errors.cnPass =
        "Password must be at least 8 characters long and include a letter and a number";
      isValid = false;
    }

    if (newPassword !== confirmNewPassword) {
      errors.confirmPassword = "Password doesn't match";
      isValid = false;
    }
    setNewPasswordError(errors);
    return isValid;
  }

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

  const handleOtpVerify = async () => {
    if (otp.includes("")) {
      setOtpError(true);
    } else {
      setOtpError(false);

      if (generatedOtp === otp.join("")) {
        setPassFlag(true);
        setForget(true);
      } else {
        setVerified(true);
        setTimeout(() => {
          setVerified(false);
        }, 3000);
      }
    }
  };

  const handleForgetPass = () => {
    setForget(false);
  };

  async function handleSend() {
    if (await validateEmail()) {
      generateOtp();
      setShowOtp(true);
    } else {
      setTimeout(() => {
        setEmailErrors({
          email: "",
        });
      }, 3000);
    }
  }

  async function resetPassword() {
    if (validateNewPassword()) {
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_SERVER}/resetPassword`,
          {
            email: email,
            newPassword: confirmNewPassword,
          }
        );
        if (result.status === 200) {
          setFormErrors((prev) => ({
            ...prev,
            password: "Password reset successful",
          }));
          setLoad2(true);
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          setFormErrors((prev) => ({
            ...prev,
            password: "Error resetting password",
          }));
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setFormErrors((prev) => ({
            ...prev,
            password: "User doesn't exist",
          }));
        } else {
          setFormErrors((prev) => ({
            ...prev,
            password: "Error resetting password",
          }));
        }
      }
    } else {
      setTimeout(() => {
        setNewPasswordError({
          confirmPassword: "",
          nPass: "",
          cnPass: "",
        });
      }, 3000);
    }
  }

  async function googleOauth() {
    window.location.href = `${process.env.NEXT_PUBLIC_SERVER}/auth/google/signin`;
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar2 />
      <div className="container mx-auto px-4 py-10 md:py-32">
        <div className="max-w-md mx-auto">
          <div className="bg-[#111] rounded-xl border border-gray-800 p-8 shadow-xl">
            <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
              Sign In
            </h1>

            {forget && !passFlag && (
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
                  onClick={handleLogin}
                >
                  {load ? (
                    <span className="loading loading-dots loading-md"></span>
                  ) : (
                    "Sign In"
                  )}
                </button>

                <div className="text-center mt-4">
                  <button
                    className="text-[#7FFFD4] hover:text-[#00CED1] transition-colors text-sm"
                    onClick={handleForgetPass}
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#111] text-gray-400">OR</span>
                  </div>
                </div>

                <button
                  className="w-full bg-white text-black font-medium py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                  onClick={googleOauth}
                >
                  {loading2 ? (
                    <span className="loading loading-dots loading-md"></span>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Sign in with Google
                    </>
                  )}
                </button>
              </div>
            )}

            {!forget && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    className={`w-full bg-black border ${
                      emailErrors.email ? "border-red-500" : "border-gray-700"
                    } rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7FFFD4] transition-colors`}
                    placeholder="Enter your email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#7FFFD4] text-black px-3 py-1 rounded-md text-sm font-medium"
                    onClick={handleSend}
                  >
                    Send
                  </button>
                </div>
                {emailErrors.email && (
                  <p className="text-sm text-red-500 mt-1">
                    {emailErrors.email}
                  </p>
                )}
              </div>
            )}

            {!forget && showOtp && (
              <div className="mt-6 space-y-4">
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
                  Verify
                </button>
              </div>
            )}

            {passFlag && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword2 ? "text" : "password"}
                      className={`w-full bg-black border ${
                        newPasswordError.nPass
                          ? "border-red-500"
                          : "border-gray-700"
                      } rounded-lg pl-10 pr-10 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7FFFD4] transition-colors`}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword2(!showPassword2)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <Eye className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                  {newPasswordError.nPass && (
                    <p className="text-sm text-red-500 mt-1">
                      {newPasswordError.nPass}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword3 ? "text" : "password"}
                      className={`w-full bg-black border ${
                        newPasswordError.cnPass
                          ? "border-red-500"
                          : "border-gray-700"
                      } rounded-lg pl-10 pr-10 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7FFFD4] transition-colors`}
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(event) =>
                        setConfirmNewPassword(event.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword3(!showPassword3)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <Eye className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                  {newPasswordError.cnPass && (
                    <p className="text-sm text-red-500 mt-1">
                      {newPasswordError.cnPass}
                    </p>
                  )}
                </div>

                {newPasswordError.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">
                    {newPasswordError.confirmPassword}
                  </p>
                )}

                <button
                  className="w-full bg-gradient-to-r from-[#7FFFD4] to-[#00CED1] text-black font-medium py-2 rounded-lg hover:opacity-90 transition-opacity"
                  onClick={resetPassword}
                >
                  Set Password
                </button>
              </div>
            )}

            <div className="text-center text-sm text-gray-400 mt-6">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-[#7FFFD4] hover:text-[#00CED1] transition-colors"
              >
                Sign up
              </Link>
            </div>

            {load && (
              <span className="loading loading-spinner text-primary"></span>
            )}
            {load2 && (
              <span className="loading loading-spinner text-primary"></span>
            )}
          </div>
        </div>
      </div>
      {/* <Footer /> */}
    </div>
  );
}
