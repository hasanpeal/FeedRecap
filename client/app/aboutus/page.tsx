"use client"
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import "@/app/aboutus/about.css";
export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gray-100 mainStart">
      {/* Navbar */}
      <header className="bg-white shadow-md">
        <div className=" py-4 px-6 flex">
          <Link href="/" className="text-xl font-bold text-gray-800 flex-grow">
            FeedRecap
          </Link>
          <nav className="space-x-4 buttonss">
            <Link href="/signin">
              <button className="text-gray-800 font-semibold sButton">
                Sign In
              </button>
            </Link>
            <Link href="/signup">
              <button className="text-gray-800 font-semibold">Sign Up</button>
            </Link>
          </nav>
        </div>
      </header>

      {/* About Us Section */}
      <section className="py-20 bg-white-200">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-gray-800 mb-10 text-center">
            About Us
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            At FeedRecap, we believe staying informed shouldn’t feel
            overwhelming. Founded with the idea that everyone deserves quick,
            easy access to the news they care about, our app delivers
            personalized newsletters packed with top tweets. Whether it&apos;s
            politics, finance, sports, or tech, FeedRecap ensures you&apos;re
            always in the loop
          </p>
          <h3 className="text-3xl font-semibold text-gray-800 mb-6 text-center">
            Our Mission
          </h3>
          <p className="text-gray-600 text-lg mb-8">
            Our mission is to simplify the way you consume news. By curating top
            tweets from trusted sources, we help you stay informed about what
            matters to you—without wasting time scrolling. We aim to deliver
            valuable, personalized content that keeps you connected to the
            topics you care about most
          </p>
          <h3 className="text-3xl font-semibold text-gray-800 text-center">
            How It Works
          </h3>
          <ul className="list-disc list-inside text-gray-600 text-lg mb-8">
            <li>Sign up and create a profile to get started</li>
            <li>
              After signing up, simply choose your categories and preferred
              delivery times
            </li>
            <li>
              Our AI scours Twitter for the latest and most relevant tweets on
              your chosen topics
            </li>
            <li>
              {" "}
              At your specified time, you’ll receive a beautifully curated
              newsletter straight to your inbox—keeping you informed without the
              hassle
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-100 mb-14">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-gray-800 mb-10 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            <div>
              <h4 className="text-2xl font-semibold text-gray-800 mb-2 text-center">
                How do I change my preferences?
              </h4>
              <p className="text-gray-600 text-lg text-center">
                You can update your categories and preferred times anytime from
                your personal dashboard
              </p>
            </div>
            <div>
              <h4 className="text-2xl font-semibold text-gray-800 mb-2 text-center">
                What categories can I select?
              </h4>
              <p className="text-gray-600 text-lg text-center">
                We offer a variety of topics including Politics, Financial
                Markets, Sports, Tech, and more!
              </p>
            </div>
            <div>
              <h4 className="text-2xl font-semibold text-gray-800 mb-2 text-center">
                Can I receive more than one newsletter a day?
              </h4>
              <p className="text-gray-600 text-lg text-center">
                Yes! You can choose up to three times a day—morning, afternoon,
                and night—for your newsletters
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed App Functions Section */}

      {/* Footer */}
      <Footer />
    </div>
  );
}
