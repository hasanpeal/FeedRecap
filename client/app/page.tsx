"use client";
import Head from "next/head";
import Link from "next/link";
import "@/app/home.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import CookieConsent from "@/components/cookies";
import AnnouncementBar from "@/components/announcement";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 homeMain">
      {/* Navbar */}
      <AnnouncementBar />
      <Navbar />

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center py-20 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-300 text-white">
        <h1 className="text-5xl font-bold mb-4 ml-4 mr-4">
          Stay Informed and Save Time
        </h1>
        <p className="text-xl mb-8 ml-8 mr-8">
          FeedRecap gives you daily curated tweets and summaries of current
          events accross politics, finance, tech, AI, and many more
        </p>
        <div className="flex space-x-4">
          <Link href="/signin">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-md shadow-md transition-transform transform hover:scale-105">
              Get Started
            </button>
          </Link>
          <Link href="/signup">
            <button className="bg-gray-800 text-white px-6 py-3 rounded-md shadow-md transition-transform transform hover:scale-105">
              Sign Up
            </button>
          </Link>
        </div>
      </main>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-gray-800 mb-10 text-center">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gray-100 p-6 rounded-lg shadow-lg">
                <h3 className="text-2xl font-semibold text-gray-800">Step 1</h3>
                <p className="text-gray-600 mt-2 text-center">
                  Create your account and pick the categories and times that fit
                  your schedule and select your preferred categories and times
                </p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-gray-100 p-6 rounded-lg shadow-lg">
                <h3 className="text-2xl font-semibold text-gray-800">Step 2</h3>
                <p className="text-gray-600 mt-2 text-center">
                  Our AI-powered engine curates the top tweets based on your
                  preferences and delivers them straight to your inbox
                </p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-gray-100 p-6 rounded-lg shadow-lg">
                <h3 className="text-2xl font-semibold text-gray-800">Step 3</h3>
                <p className="text-gray-600 mt-2 text-center">
                  View your newsletters on your dashboard, adjust preferences
                  anytime, and see how many newsletters you&apos;ve received
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-gray-800 mb-10 text-center">
            Features
          </h2>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                Curated Content
              </h3>
              <p className="text-gray-600 text-center">
                Receive the most relevant tweets from trusted accounts,
                customized to your selected categories and times
              </p>
            </div>
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                Personalized Dashboard
              </h3>
              <p className="text-gray-600 text-center">
                Manage your preferences, see the latest newsletters, and track
                how many you’ve received—right from your personal dashboard
              </p>
            </div>
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                Seamless Scheduling
              </h3>
              <p className="text-gray-600 text-center">
                Choose when you want your newsletters delivered—morning,
                afternoon, or night—so you always stay informed when it&apos;s
                convenient for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-gray-800 mb-10 text-center">
            Testimonials
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-100 p-6 rounded-lg shadow-lg">
              <p className="text-gray-600 text-center">
                FeedRecap helps me stay updated with important news without
                wasting time scrolling!
              </p>
              <h3 className="text-xl font-semibold text-gray-800 mt-4 text-right">
                Mark Robert
              </h3>
            </div>
            <div className="bg-gray-100 p-6 rounded-lg shadow-lg">
              <p className="text-gray-600 text-center">
                I love the curated updates, I feel more in control of my day!
                Amazing time saving tool for me
              </p>
              <h3 className="text-xl font-semibold text-gray-800 mt-4 text-right">
                Jaden Ray
              </h3>
            </div>
            <div className="bg-gray-100 p-6 rounded-lg shadow-lg">
              <p className="text-gray-600 text-center">
                The best way to catch up on the day&apos;s top news quickly! I
                really love the contents that I get through newsletter form
              </p>
              <h3 className="text-xl font-semibold text-gray-800 mt-4 text-right">
                Emily Chen
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 text-white text-center">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-10">Our Mission</h2>
          <p className="text-xl mb-8">
            Our mission is to simplify the way you consume news. By curating top
            tweets from trusted sources, we help you stay informed about what
            matters to you—without wasting time scrolling. We aim to deliver
            valuable, personalized content that keeps you connected to the
            topics you care about most
          </p>
          <div className="space-x-4">
            <Link href="/signup">
              <button className="bg-white text-green-600 px-6 py-3 rounded-md shadow-md transition-transform transform hover:scale-105">
                Get Started
              </button>
            </Link>
            <Link href="/signin">
              <button className="bg-white text-blue-600 px-6 py-3 rounded-md shadow-md transition-transform transform hover:scale-105">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
      <CookieConsent />
    </div>
  );
}
