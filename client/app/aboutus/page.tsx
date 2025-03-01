"use client";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import "@/app/aboutus/about.css";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* About Us Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-10 text-center bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
            About Us
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            At FeedRecap, we believe staying informed shouldn&apos;t feel
            overwhelming. Founded with the idea that everyone deserves quick,
            easy access to the news they care about, our app delivers
            personalized newsletters packed with top tweets. Whether it&apos;s
            politics, finance, sports, or tech, FeedRecap ensures you&apos;re
            always in the loop.
          </p>
          <h3 className="text-3xl font-semibold mb-6 text-center bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
            Our Mission
          </h3>
          <p className="text-gray-300 text-lg mb-8">
            Our mission is to simplify the way you consume news. By curating top
            tweets from trusted sources, we help you stay informed about what
            matters to you—without wasting time scrolling. We aim to deliver
            valuable, personalized content that keeps you connected to the
            topics you care about most.
          </p>
          <h3 className="text-3xl font-semibold text-center bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
            How It Works
          </h3>
          <ul className="list-disc list-inside text-gray-300 text-lg mb-8 mt-4">
            <li>Sign up and create a profile to get started</li>
            <li>
              After signing up, simply choose your categories and preferred
              delivery times
            </li>
            <li>
              Our AI scours X for the latest and most relevant tweets on your
              chosen topics
            </li>
            <li>
              At your specified time, you&apos;ll receive a beautifully curated
              newsletter straight to your inbox—keeping you informed without the
              hassle
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-10 text-center bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            <div className="bg-black p-6 rounded-lg border border-gray-800">
              <h4 className="text-2xl font-semibold mb-2 text-[#7FFFD4]">
                How do I change my preferences?
              </h4>
              <p className="text-gray-300 text-lg">
                You can update your categories and preferred times anytime from
                your personal dashboard.
              </p>
            </div>
            <div className="bg-black p-6 rounded-lg border border-gray-800">
              <h4 className="text-2xl font-semibold mb-2 text-[#7FFFD4]">
                What categories can I select?
              </h4>
              <p className="text-gray-300 text-lg">
                We offer a variety of topics including Politics, Financial
                Markets, Sports, Tech, and more!
              </p>
            </div>
            <div className="bg-black p-6 rounded-lg border border-gray-800">
              <h4 className="text-2xl font-semibold mb-2 text-[#7FFFD4]">
                Can I receive more than one newsletter a day?
              </h4>
              <p className="text-gray-300 text-lg">
                Yes! You can choose up to three times a day—morning, afternoon,
                and night—for your newsletters.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
