"use client";
import axios from "axios";
import React, { useState, useRef, KeyboardEvent } from "react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import "@/app/signin/signin.css";
import eye from "@/public/eye.svg";
import { useRouter } from "next/navigation";
import { useEmail } from "@/context/UserContext"; 
import Navbar2 from "@/components/navbar2";
import Footer2 from "@/components/footer2";
import CookieConsent from "@/components/cookies";

const Signup: React.FC = () => {
  const [flag, setFlag] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [load, setLoad] = useState(false);
  const [username, setUsername] = useState("");
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
      const code = result.data.code;
      // console.log(code);
      if (code === 0) return true;
      else false;
    } catch (err) {
      // console.log("Error in emailAlreadyExist function");
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
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, firstName: "" }));
      }, 3000);
    }
    if (!lastName) {
      errors.lastName = "Last name is required";
      isValid = false;
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, lastName: "" }));
      }, 3000);
    }
    if (!email) {
      errors.email = "Email is required";
      isValid = false;
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, email: "" }));
      }, 3000);
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Not a valid email";
      isValid = false;
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, email: "" }));
      }, 3000);
    } else if (await emailAlreadyExist()) {
      errors.email = "Email already registered";
      isValid = false;
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, email: "" }));
      }, 3000);
    }
    if (!password) {
      errors.password = "Password is required";
      isValid = false;
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, password: "" }));
      }, 3000);
    } else if (
      password.length < 8 ||
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      errors.password =
        "Password must be at least 8 characters long and include a letter and a number";
      isValid = false;
      setTimeout(() => {
        setFormErrors((prevErrors) => ({ ...prevErrors, password: "" }));
      }, 3000);
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
          setLoad(true);
          const result = await axios.post(
            `${process.env.NEXT_PUBLIC_SERVER}/register`,
            {
              firstName,
              lastName,
              email,
              password,
            }
          );

          if (result.data.code == 0) {
            setEmailContext(email);
            toast.success("Sign up successful")
            const response = await axios.get(
              `${process.env.NEXT_PUBLIC_SERVER}/getIsNewUser`,
              {
                params: { email: email },
              }
            );

            if (response.data.code == 0 && response.data.isNewUser)
              router.push("/newuser");
            else if (response.data.code == 0 && !response.data.isNewUser)
              router.push("/dashboard");
            else toast.error("Server Error");
          } else toast.error("Server error");
        } catch (error) {
          console.log(error);
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
      console.log(error);
    }
    // console.log("OTP generated");
  };

  function googleOauth(): void {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="mainStart bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
      <Navbar2 />
      <div className="mainContainer2 pb-40 mt-40">
        <div className="card bg-base-100 w-96 shadow-xl cardDiv">
          <article className="text-center text-xl text-bold mt-4">
            {" "}
            Sign up
          </article>
          <Toaster />
          <div>
            <label className="input input-bordered flex items-center gap-2">
              <input
                type="text"
                className={`grow ${
                  formErrors.firstName ? "border-red-500" : ""
                }`}
                placeholder="First Name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </label>
            {formErrors.firstName && (
              <p className="alertText text-red-500">{formErrors.firstName}</p>
            )}
          </div>

          <div>
            <label className="input input-bordered flex items-center gap-2">
              <input
                type="text"
                className={`grow ${
                  formErrors.lastName ? "border-red-500" : ""
                }`}
                placeholder="Last Name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </label>
            {formErrors.lastName && (
              <p className="alertText text-red-500">{formErrors.lastName}</p>
            )}
          </div>

          <div>
            <label className="input input-bordered flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-4 w-4 opacity-70"
              >
                <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
                <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
              </svg>
              <input
                type="email"
                className={`grow ${formErrors.email ? "border-red-500" : ""}`}
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {formErrors.email && (
              <p className="alertText text-red-500">{formErrors.email}</p>
            )}
          </div>

          <div>
            <label className="input input-bordered flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-4 w-4 opacity-70"
              >
                <path
                  fillRule="evenodd"
                  d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                className={`grow ${
                  formErrors.password ? "border-red-500" : ""
                }`}
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="btn btn-ghost showBtn"
                onClick={() => setShowPassword(!showPassword)}
              >
                <Image
                  src={eye}
                  alt="eye-twotone"
                  className="showIcon"
                  height="10"
                  width="10"
                />
              </button>
            </label>
            {formErrors.password && (
              <p className="alertText text-red-500">{formErrors.password}</p>
            )}
          </div>

          {flag && (
            <button
              className="btn btn-primary btnSubmit "
              onClick={handleSignup}
            >
              Sign up
            </button>
          )}

          {flag && (
            <p>
              {" "}
              Already have an account?{" "}
              <Link href="/signin" className="links">
                Sign in
              </Link>
            </p>
          )}

          {/* After sign up is clicked */}
          {!flag && (
            <div id="otpSection">
              <p>Please enter the 6-digit OTP sent to your email</p>
              <div className="otpBox">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    value={digit}
                    className={`otpInput w-12 h-12 ${
                      otpError && !digit ? "border-red-500" : ""
                    }`}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                  />
                ))}

                {verified && (
                  <p className="alertText text-red-500 customAlert">
                    {" "}
                    Wrong OTP
                  </p>
                )}

                {load && (
                  <span className="loading loading-spinner text-primary Load"></span>
                )}
              </div>

              <div className="verifyBtn">
                <button
                  className="btn btn-active btn-primary"
                  onClick={handleOtpVerify}
                >
                  Verify
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer2/>
      <CookieConsent/>
    </div>
  );
};

export default Signup;
