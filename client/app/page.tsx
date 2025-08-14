"use client";
import Head from "next/head";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { useEmail } from "@/context/UserContext";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ArrowRight, Twitter } from "lucide-react";

export default function Home() {
  const { setEmailContext } = useEmail();
  const router = useRouter();
  const newsletterText = `<p><strong>Summary:</strong> 📣 Market volatility persists as sentiment shifts rapidly, with bullish and bearish tweets vying for attention. While some fear a market downturn, others remain optimistic about Bitcoin&#39;s future. Breaking news on Trump&#39;s comments about the Ukraine-Russia war and institutional investments in crypto provide reasons for both celebration and concern.</p> </br>

<p><strong>Market News and Sentiment:</strong> 🚨</p>
<ul>
<li>Crypto pundit expresses frustration with substantial losses, urging patience despite the bear market. 📈</li>
<li>Despite recent sell-offs, bullish predictions abound, with altcoins expected to surge exponentially. 🚀</li>
<li>Institutional interest remains strong, with Citadel Securities&#39; plans to support Bitcoin liquidity 💰</li>
<li>U.S. stocks are in decline, raising concerns for crypto markets. 📉</li>
</ul></br>

<p><strong>Data Points and Industry Analysis:</strong> 📊</p>
<ul>
<li>Bitcoin dominance at 66% remains possible, indicating potential weakness in altcoins. 💡</li>
<li>Beware of narratives chasing price action, especially in post-capitulation rallies. 💬</li>
<li>&quot;Alpha&quot; stems from identifying narratives ahead of consensus. 💡</li>
<li>Stock market weakness may persist until March 21st, based on historical trends. 📈</li>
</ul></br>

<p><strong>Political Pulse:</strong> ⚖️</p>
<ul>
<li>House Republicans remain steadfast in their budget cuts despite protests. 💪</li>
<li>Democrats plan to highlight Republicans&#39; healthcare stance as a campaign strategy. ⛑️</li>
<li>Elon Musk&#39;s involvement in the upcoming California governor&#39;s race adds another layer of intrigue. 💡</li>
<li>Politicians on the local and national stage face challenges and endorsements as the political landscape shifts. 📣</li>
</ul></br>
<p><strong>TOP POSTS OF TODAY:</strong></p>
  <ul class="list-disc pl-5 space-y-4">
    <li>FUCK THIS CRYPTO SHIT! DOWN $5M IN LAST 24HRS LONGED ETH AND IT WENT TO SHIT. I HAVE SOLD EVERYTHING. WE ARE FUCKED. BULL MARKET IS OVER - @Ashcryptoreal <a href="https://x.com/Ashcryptoreal/status/1894295330021412969" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline"> View Post</a></li>
    <li>DON’T SELL EARLY! DON’T GET SHAKEN OUT ALTSEASON HAS NOT STARTED YET. ALTCOINS WILL PUMP 10X-20X FROM HERE EASILY. PATIENCE. - @Ashcryptoreal <a href="https://x.com/Ashcryptoreal/status/1894093027901071457" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline"> View Post</a></li>
    <li>IF YOU SELL BITCOIN NOW YOU ARE A LITTLE BITCH - @Ashcryptoreal <a href="https://x.com/Ashcryptoreal/status/1894290223775060217" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline"> View Post</a></li>
    <li>Woke up and saw this, WHAT THE FUCK JUST HAPPENED?? - @Ashcryptoreal <a href="https://x.com/Ashcryptoreal/status/1894216247291642138" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline"> View Post</a></li>
  </ul>
`;

  const [displayText, setDisplayText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < newsletterText.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + newsletterText[index]);
        setIndex(index + 1);
      }, 2); // Adjust speed for typing effect

      return () => clearTimeout(timeout);
    }
  }, [index]);

  React.useEffect(() => {
    const storage = async () => {
      const savedEmail = localStorage.getItem("email");
      if (savedEmail) {
        setEmailContext(savedEmail);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER}/getIsNewUser`,
          {
            params: { email: savedEmail },
          }
        );

        if (response.status === 200 && response.data.isNewUser)
          router.push("/newuser");
        else if (response.status === 200 && !response.data.isNewUser)
          router.push("/dashboard");
      }
    };
    storage();
  }, [setEmailContext, router]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>FeedRecap - Stay Informed and Save Time</title>
        <meta
          name="description"
          content="FeedRecap gives you daily curated tweets and summaries of current events across politics, finance, tech, AI, and more"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center sm:py-24 py-10  px-4">
        <div className="max-w-4xl mx-auto">
          {/* FeedRecap Logo */}

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-5xl font-bold mb-6 text-white">
            Never Miss What Matters on X
          </h1>

          {/* Subheading */}
          <h2 className="text-lg sm:text-2xl text-white mb-8 mx-2 sm:mx-0">
            FeedRecap delivers the top X posts you care about—straight to your
            inbox
          </h2>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mx-4 sm:mx-0">
            <Link href="/signup">
              <button className="bg-gradient-to-r from-[#7FFFD4] to-[#00CED1] text-black font-medium px-8 py-3 rounded-full shadow-lg hover:shadow-[#7FFFD4]/20 transition-all duration-300 w-full sm:w-auto">
                Get Started
              </button>
            </Link>
            <Link href="/signin">
              <button className="bg-transparent border border-[#7FFFD4] text-[#7FFFD4] font-medium px-8 py-3 rounded-full shadow-lg hover:bg-[#7FFFD4]/10 transition-all duration-300 w-full sm:w-auto">
                Sign In
              </button>
            </Link>
          </div>

          {/* Information Section */}
          <div className="mt-10 text-gray-300 space-y-4  mx-2 sm:mx-auto">
            <p className="text-[#7FFFD4] font-semibold text-xl">
              ∞ Stay in the loop without the noise
            </p>
            <p className="text-white sm:text-xl">
              FeedRecap analyzes X for you, summarizing the biggest events,
              updates, and posts from the accounts you follow or topics you
              love. Get AI-powered daily newsletters (up to 3x a day) with
              bite-sized recaps and direct links to the must-see posts—curated
              just for you
            </p>

            <p className="text-[#7FFFD4] font-semibold text-xl">
              ☑ Take control of your feed
            </p>
            <p className="text-white sm:text-xl">
              Log into FeedRecap and explore a custom newsfeed of the latest top
              posts, free from X’s algorithm clutter
            </p>
          </div>
        </div>
      </main>

      {/* Featured Topics Section */}
      {/* <section className="py-20 ">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-10 text-center bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
            Curated Topics
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              "Politics",
              "Crime",
              "Breaking",
              "Sports",
              "Crypto",
              "World",
              "Comedy",
            ].map((topic) => (
              <div
                key={topic}
                className="border border-[#7FFFD4]/30 text-[#7FFFD4] px-6 py-2 rounded-full hover:bg-[#7FFFD4]/10 transition-all cursor-pointer"
              >
                {topic}
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-sm text-center mt-4">
            *Select topics to filter your feed
          </p>
        </div>
      </section> */}

      {/* How It Works Section */}
      <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#111] p-8 rounded-xl border border-gray-800 hover:border-[#7FFFD4]/30 transition-all">
              <div className="w-12 h-12 bg-[#7FFFD4] text-black rounded-full flex items-center justify-center font-bold text-xl mb-4">
                1
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">
                Sign Up & Customize
              </h3>
              <p className="text-gray-400">
                Create your account, pick your topics (like tech or politics),
                and set delivery times that match your routine
              </p>
            </div>
            <div className="bg-[#111] p-8 rounded-xl border border-gray-800 hover:border-[#7FFFD4]/30 transition-all">
              <div className="w-12 h-12 bg-[#7FFFD4] text-black rounded-full flex items-center justify-center font-bold text-xl mb-4">
                2
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">
                AI Gets to Work
              </h3>
              <p className="text-gray-400">
                Our AI scans X, curating the top posts based on your preferences
                and sending them straight to your inbox
              </p>
            </div>
            <div className="bg-[#111] p-8 rounded-xl border border-gray-800 hover:border-[#7FFFD4]/30 transition-all">
              <div className="w-12 h-12 bg-[#7FFFD4] text-black rounded-full flex items-center justify-center font-bold text-xl mb-4">
                3
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">
                Stay in Control
              </h3>
              <p className="text-gray-400">
                Check newsletters on your dashboard, tweak settings anytime, and
                track what’s landed—all in one spot
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-black to-[#111]">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
            Features
          </h2>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-[#111] p-8 rounded-xl border border-gray-800 hover:border-[#7FFFD4]/30 transition-all">
              <div className="w-12 h-12 bg-[#7FFFD4]/10 rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  x="0px"
                  y="0px"
                  width="24"
                  height="24"
                  viewBox="0,0,256,256"
                >
                  <g
                    fill="#7fffd4"
                    fillRule="nonzero"
                    stroke="none"
                    strokeWidth="1"
                    strokeLinecap="butt"
                    strokeLinejoin="miter"
                    strokeMiterlimit="10"
                    strokeDasharray=""
                    strokeDashoffset="0"
                    fontFamily="none"
                    fontWeight="none"
                    fontSize="none"
                    textAnchor="none"
                    style={{ mixBlendMode: "normal" }}
                  >
                    <g transform="scale(10.66667,10.66667)">
                      <path d="M2.36719,3l7.0957,10.14063l-6.72266,7.85938h2.64063l5.26367,-6.16992l4.31641,6.16992h6.91016l-7.42187,-10.625l6.29102,-7.375h-2.59961l-4.86914,5.6875l-3.97266,-5.6875zM6.20703,5h2.04883l9.77734,14h-2.03125z"></path>
                    </g>
                  </g>
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">
                Curated Brilliance
              </h3>
              <p className="text-gray-400">
                Get the most relevant X posts from your favorite sources,
                tailored to your interests and schedule
              </p>
            </div>
            <div className="bg-[#111] p-8 rounded-xl border border-gray-800 hover:border-[#7FFFD4]/30 transition-all">
              <div className="w-12 h-12 bg-[#7FFFD4]/10 rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-[#7FFFD4]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">
                Your Command Center
              </h3>
              <p className="text-gray-400">
                Adjust preferences, browse newsletters, and see your history on
                a sleek, personalized dashboard
              </p>
            </div>
            <div className="bg-[#111] p-8 rounded-xl border border-gray-800 hover:border-[#7FFFD4]/30 transition-all">
              <div className="w-12 h-12 bg-[#7FFFD4]/10 rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-[#7FFFD4]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">
                Perfect Timing
              </h3>
              <p className="text-gray-400">
                Pick morning, afternoon, or night delivery—stay informed when it
                works for you
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsfeed Preview Section */}
      <section className="py-20 bg-[#111]">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
            Sample Newsletter
          </h2>
          <div className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-800 p-6 bg-black text-white text-lg leading-relaxed h-[500px] overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: displayText }} />
          </div>
          <div className="text-center mt-6">
            <Link href="/signup">
              <button className="bg-gradient-to-r from-[#7FFFD4] to-[#00CED1] text-black font-medium px-8 py-3 rounded-full shadow-lg hover:shadow-[#7FFFD4]/20 transition-all duration-300">
                Get Started Now{" "}
                <ArrowRight className="inline-block ml-2 h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
            Testimonials
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#111] p-8 rounded-xl border border-gray-800">
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-[#7FFFD4]"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 mb-6">
                &quot;FeedRecap helps me stay updated with important news
                without wasting time scrolling!&quot;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[#7FFFD4]/20 rounded-full flex items-center justify-center text-[#7FFFD4] font-bold">
                  MR
                </div>
                <h3 className="text-lg font-semibold text-white ml-3">
                  Mark Robert
                </h3>
              </div>
            </div>
            <div className="bg-[#111] p-8 rounded-xl border border-gray-800">
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-[#7FFFD4]"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 mb-6">
                &quot;I love the curated updates, I feel more in control of my
                day! Amazing time saving tool for me.&quot;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[#7FFFD4]/20 rounded-full flex items-center justify-center text-[#7FFFD4] font-bold">
                  JR
                </div>
                <h3 className="text-lg font-semibold text-white ml-3">
                  Jaden Ray
                </h3>
              </div>
            </div>
            <div className="bg-[#111] p-8 rounded-xl border border-gray-800">
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-[#7FFFD4]"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 mb-6">
                &quot;The best way to catch up on the day&apos;s top news
                quickly! I really love the contents that I get through
                newsletter form.&quot;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[#7FFFD4]/20 rounded-full flex items-center justify-center text-[#7FFFD4] font-bold">
                  EC
                </div>
                <h3 className="text-lg font-semibold text-white ml-3">
                  Emily Chen
                </h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 ">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
            Our Mission
          </h2>
          <p className="text-md sm:text-xl mb-10 text-gray-300">
            The news landscape is changing—X is where it breaks first. Our
            mission is to make sense of it all, curating top posts from your
            favorite sources to keep you dialed into what matters most.
            FeedRecap cuts through the noise, skips the scroll, and delivers
            personalized updates that fit your life. We are here to keep you
            connected, without the chaos
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/signup">
              <button className="bg-gradient-to-r from-[#7FFFD4] to-[#00CED1] text-black font-medium px-8 py-3 rounded-full shadow-lg hover:shadow-[#7FFFD4]/20 transition-all duration-300 w-full sm:w-auto">
                Get Started
              </button>
            </Link>
            <Link href="/signin">
              <button className="bg-transparent border border-[#7FFFD4] text-[#7FFFD4] font-medium px-8 py-3 rounded-full shadow-lg hover:bg-[#7FFFD4]/10 transition-all duration-300 w-full sm:w-auto">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
      {/* <CookieConsent /> */}
    </div>
  );
}
