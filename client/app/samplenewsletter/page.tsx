"use client";
import Link from "next/link";
import "@/app/home.css";
import Navbar2 from "@/components/navbar2";
import Footer from "@/components/footer";

export default function SampleNewsletter() {
  return (
    <div className="min-h-screen bg-gray-100 homeMain">
      {/* Navbar */}
      <Navbar2 />

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center py-20 bg-gradient-to-r from-blue-900 via-blue-700 to-black text-white">
        <h1 className="text-5xl font-bold mb-4 ml-4 mr-4">
          Sample Newsletters You Can Expect from FeedRecap
        </h1>
        <p className="text-xl mb-8 ml-8 mr-8">
          Here are sample newsletters showcasing the kind of content you’ll
          receive daily.
        </p>
      </main>

      {/* Sample Newsletters Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-gray-800 mb-10 text-center">
            Sample Newsletters
          </h2>

          {/* Newsletter 1 */}
          <div className="mb-10 p-8 bg-gray-100 rounded-lg shadow-lg">
            <h3 className="text-3xl font-bold text-gray-800 mb-6">
              Newsletter 1:
            </h3>

            {/* Politics Section */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">
              Politics
            </h4>
            <ul className="list-disc pl-6 mb-6">
              <li>
                Kamala Harris is getting record levels of support among young
                Black and Latino men. (Politico)
              </li>
              <li>
                Who won the day? Harris says she believes Trump is a fascist at
                CNN town hall. (Axios)
              </li>
              <li>
                Obama rapped Eminem&apos;s &quot;Lose Yourself&quot; at a
                Detroit rally. (The New York Times)
              </li>
              <li>
                LA Times editor resigns after owner blocks Harris endorsement.
                (The Los Angeles Times)
              </li>
              <li>
                Harris to make closing argument at same D.C. spot where Trump
                made speech on Jan. 6. (The Washington Post)
              </li>
              <li>
                Florida AG sues DOJ over blocking its investigation into Trump
                assassination attempt. (The Washington Post)
              </li>
              <li>
                Vice President Kamala Harris’ trip to Delco this evening is a
                reminder of just how much she needs to run up the score in the
                Philadelphia suburbs to have a chance at the White House. (The
                Philadelphia Inquirer)
              </li>
              <li>
                Poll shows California’s Prop 36 crime initiative poised to pass
                by large margin. (The Los Angeles Times)
              </li>
              <li>
                New leaders at Boeing, Starbucks and Nike face similar problems.
                (The New York Times)
              </li>
            </ul>

            {/* Geopolitics Section */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">
              Geopolitics
            </h4>
            <ul className="list-disc pl-6 mb-6">
              <li>
                Attack at Turkish aviation company causes deaths, says minister.
                (Reuters)
              </li>
              <li>
                Watch: Biden says ‘lock Trump up...politically’ at CNN town
                hall. (The Washington Post)
              </li>
              <li>
                Russia’s top general warns of ‘unpredictable consequences’ if
                U.S. provides long-range missiles to Ukraine. (The New York
                Times)
              </li>
              <li>
                Boeing workers reject contract offer as efforts to end strike
                fail. (Reuters)
              </li>
              <li>
                @LindaBRosenthal @JShepherd_MD @OulaHealth @ahnickerson &
                @HannahBronfman on the Time CNN talked w/ Fox’s audience on
                innovations in women&apos;s health care, featuring N.Y.
                Assemblymember @LindaBRosenthal, Ajenda founder Dr. Jennifer
                Ashton, OBGYN @JShepherd_MD, @OulaHealth CEO @ahnickerson &
                influencer @HannahBronfman. (Twitter)
              </li>
              <li>Trump taps Native American campaign surrogates. (Axios)</li>
              <li>
                New leaders at Boeing, Starbucks and Nike face similar problems.
                (The New York Times)
              </li>
            </ul>

            {/* Finance Section */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">
              Finance
            </h4>
            <ul className="list-disc pl-6 mb-6">
              <li>
                Bill Gates privately donates $50 million to Harris. (Skew)
              </li>
              <li>
                Justice Department warns Elon Musk that his $1 million giveaway
                might be illegal. (The New York Times)
              </li>
              <li>
                Tesla delivers upbeat third quarter amid swirling questions
                about Musk&apos;s political activity. (The Washington Post)
              </li>
              <li>
                Senate Republicans unleash massive ad campaign in Blue Wall
                states. (The Hill)
              </li>
              <li>
                WATCH: Axios hosts conversations on innovations in women&apos;s
                health care, featuring N.Y. Assemblymember @LindaBRosenthal,
                Ajenda founder Dr. Jennifer Ashton, OBGYN @JShepherd_MD,
                @OulaHealth CEO @ahnickerson & influencer @HannahBronfman.
                (Twitter)
              </li>
              <li>
                Boeing factory workers vote to reject contract offer and
                continue a more than five-week strike. (CNBC)
              </li>
              <li>
                @LindaBRosenthal @JShepherd_MD @OulaHealth @ahnickerson &
                @HannahBronfman on the Time CNN talked w/ Fox’s audience on
                innovations in women&apos;s health care, featuring N.Y.
                Assemblymember @LindaBRosenthal, Ajenda founder Dr. Jennifer
                Ashton, OBGYN @JShepherd_MD, @OulaHealth CEO @ahnickerson &
                influencer @HannahBronfman. (Twitter)
              </li>
            </ul>

            {/* AI Section */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">AI</h4>
            <ul className="list-disc pl-6 mb-6">
              <li>
                Harris says she believes Trump is a fascist at CNN town hall.
                (Axios)
              </li>
              <li>
                Obama rapped Eminem&apos;s &quot;Lose Yourself&quot; at a
                Detroit rally. (The New York Times)
              </li>
              <li>
                LA Times editor resigns after owner blocks Harris endorsement.
                (The Los Angeles Times)
              </li>
              <li>
                Harris to make closing argument at same D.C. spot where Trump
                made speech on Jan. 6. (The Washington Post)
              </li>
              <li>
                Florida AG sues DOJ over blocking its investigation into Trump
                assassination attempt. (The Washington Post)
              </li>
              <li>
                Vice President Kamala Harris’ trip to Delco this evening is a
                reminder of just how much she needs to run up the score in the
                Philadelphia suburbs to have a chance at the White House. (The
                Philadelphia Inquirer)
              </li>
              <li>
                Poll shows California’s Prop 36 crime initiative poised to pass
                by large margin. (The Los Angeles Times)
              </li>
              <li>
                New leaders at Boeing, Starbucks and Nike face similar problems.
                (The New York Times)
              </li>
            </ul>

            {/* Other Section */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">Other</h4>
            <ul className="list-disc pl-6 mb-6">
              <li>
                Attack at Turkish aviation company causes deaths, says minister.
                (Reuters)
              </li>
              <li>
                Watch: Biden says ‘lock Trump up...politically’ at CNN town
                hall. (The Washington Post)
              </li>
              <li>
                Russia’s top general warns of ‘unpredictable consequences’ if
                U.S. provides long-range missiles to Ukraine. (The New York
                Times)
              </li>
              <li>
                Boeing workers reject contract offer as efforts to end strike
                fail. (Reuters)
              </li>
              <li>
                @LindaBRosenthal @JShepherd_MD @OulaHealth @ahnickerson &
                @HannahBronfman on the Time CNN talked w/ Fox’s audience on
                innovations in women&apos;s health care, featuring N.Y.
                Assemblymember @LindaBRosenthal, Ajenda founder Dr. Jennifer
                Ashton, OBGYN @JShepherd_MD, @OulaHealth CEO @ahnickerson &
                influencer @HannahBronfman. (Twitter)
              </li>
              <li>Trump taps Native American campaign surrogates. (Axios)</li>
              <li>
                New leaders at Boeing, Starbucks and Nike face similar problems.
                (The New York Times)
              </li>
            </ul>

            {/* Top 15 Tweets */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">
              Top 15 Tweets of Today
            </h4>
            <ul className="list-disc pl-6">
              <li>
                New poll: Trump is getting record levels of support among young
                Black and Latino men.
                <Link href="https://t.co/mrA3nzEA0Z">
                  &nbsp;@Politico 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                The pharmaceutical industry says there is sufficient oversight
                over its work, but COVID proved there isn&apos;t. Now, a
                bestselling new book by @SharylAttkisson documents how Big
                Pharma exercises undue influence over media, medicine, and even
                medical textbooks.
                <Link href="https://t.co/1nqfb4qsjF">
                  &nbsp;@shellenberger 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                Tax brackets 2025: IRS releases inflation adjustments for next
                year.
                <Link href="https://t.co/DGMxlRRx3l">
                  &nbsp;@axios 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                The media, governments, & &quot;NGOs&quot; say they just want
                less misinfo & hate speech on X, but they don&apos;t. What they
                want is to control X in order to engage in mass censorship along
                political and ideological lines. And if they can&apos;t have
                that, to kill it.
                <Link href="https://t.co/GNFLs1Q1Dv">
                  &nbsp;@Shellenberger 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                Harris says she believes Trump is a fascist at CNN town hall.
                <Link href="https://t.co/N7HJVxOcOK">
                  &nbsp;@Axios 👉{" "}
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                BILL ACKMAN: &quot;Vice President Harris puts stuff out about
                Trump that are absolutely, completely false....Just take a look
                at her 𝕏 feed. It&apos;s a series of lies about President
                Trump.&quot;
                <Link href="https://t.co/sCDyxi8xS5">
                  &nbsp;@TheChiefNerd 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                Justice Department warns Elon Musk’s America PAC that his $1
                million sweepstakes for registered voters in swing states may be
                illegal, sources say.
                <Link href="https://t.co/Eycn518kjv">
                  &nbsp;@CNN 👉<span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                Attack at Turkish aviation company causes deaths, says minister.
                <Link href="https://t.co/5RogqgZp6M">
                  &nbsp;@BBCWorld 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                The Georgia secretary of state&apos;s office said it had fended
                off a cyberattack aimed at crashing the website the state&apos;s
                voters use to request absentee ballots.
                <Link href="https://t.co/nmqC98sOWb">
                  &nbsp;@Reuters 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                The Justice Department sent a letter to the super PAC founded by
                Elon Musk warning that awarding $1 million to registered voters
                who signed a petition might violate federal laws against paying
                voters, according to people with knowledge of the situation.
                <Link href="https://t.co/vMSojHpN7y">
                  &nbsp;@NYTimes 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                🇰🇵🇷🇺10,000 NORTH KOREAN TROOPS TO JOIN RUSSIA&apos;S WAR IN
                UKRAINE BY DECEMBER. South Korea&apos;s National Intelligence
                Service (NIS) reports that 3,000 North Korean soldiers have
                already been deployed to Russia, with 10,000 total expected by
                December to support Russia’s war in Ukraine.
                <Link href="https://t.co/WWVsIRG9QM">
                  &nbsp;@MarioNawfal 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                NEW: Theo Von podcast listeners are mindblown to find out that
                JD Vance is not actually weird after the media ran a
                &quot;weird&quot; campaign against him for months.Another media
                hoax. Shocker.
                <Link href="https://t.co/gyA6l06Usd">
                  &nbsp;@CollinRugg 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                BREAKING: Turkish military has started striking Kurdish militant
                targets in Syria and Iraq.
                <Link href="https://t.co/GuCEAOVTSf">
                  &nbsp;@spectatorindex 👉
                  <span className="text-blue-500 ml-2">👉 Tweet</span>
                </Link>
              </li>
              <li>
                Elon Musk&apos;s $1m giveaway to American voters is dangerous
                for democracy. It looks certain to spawn imitators in 2028 and
                other future elections.
                <Link href="https://t.co/GuCEAOVTSf">
                  &nbsp;@TheEconomist 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                These people don&apos;t realize how much the whole country
                despises them.
                <Link href="https://t.co/Noahpinion">
                  &nbsp;@Noahpinion 👉
                  <span className="text-blue-500 ml-2">👉 Tweet</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="mb-10 p-8 bg-gray-100 rounded-lg shadow-lg">
            <h3 className="text-3xl font-bold text-gray-800 mb-6">
              Newsletter 2:
            </h3>

            {/* Politics Section */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">
              Politics
            </h4>
            <ul className="list-disc pl-6 mb-6">
              <li>
                Kamala Harris’ trip to Delco this evening is a reminder of just
                how much she needs to run up the score in the Philadelphia
                suburbs. -{" "}
                <Link href="https://t.co/8TAq3Uxh0R">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Poll shows California’s Prop 36 crime initiative poised to pass
                by large margin -{" "}
                <Link href="https://t.co/zyUt35sSmp">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Lawmakers from Trudeau’s party urged him to go. He called the
                party ‘united.’{" "}
                <Link href="https://t.co/o0lRZBwZeI">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
            </ul>

            {/* International Section */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">
              International
            </h4>
            <ul className="list-disc pl-6 mb-6">
              <li>
                Attack at Turkish aviation company causes deaths, says minister
                -{" "}
                <Link href="https://t.co/5RogqgZp6M">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Watch: Biden says ‘lock Trump up…politically’ -{" "}
                <Link href="https://t.co/MjKF0undru">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Secretary of Defense Lloyd Austin says North Korea has deployed
                troops to Russia -{" "}
                <Link href="https://t.co/uEqO7x4fAg">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Boeing workers reject contract offer as more than five-week
                strike continues -{" "}
                <Link href="https://t.co/HJF1hAfN2R">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Romanian radar picks up two likely drone signals breaching
                territory, ministry says -{" "}
                <Link href="https://t.co/0DCHY36ONF">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Immigration voters: &apos;The money in US politics absolutely
                scares me&apos; -{" "}
                <Link href="https://t.co/yXm3rpACGV">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Liberian voters: &apos;The money in US politics absolutely
                scares me&apos; -{" "}
                <Link href="https://t.co/dkswBUhS8a">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                North Gaza polio vaccinations delayed due to strikes and
                displacement -{" "}
                <Link href="https://t.co/UwGTQi47QI">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Zimbabwe set new T20 world record in Gambia win -{" "}
                <Link href="https://t.co/L4eDx7X6FC">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
            </ul>

            {/* US Elections Section */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">
              US Elections
            </h4>
            <ul className="list-disc pl-6 mb-6">
              <li>
                BILL ACKMAN: &quot;Vice President Harris puts stuff out about
                Trump that are absolutely, completely false....Just take a look
                at her 𝕏 feed. It&apos;s a series of lies about President
                Trump.&quot; -{" "}
                <Link href="https://t.co/sCDyxi8xS5">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                &apos;I invite you to listen and go online to listen to John
                Kelly, the former chief of staff of Donald Trump, who has told
                us Donald Trump said why essentially, why aren&apos;t my
                generals like those of Hitler&apos;s like Hitler&apos; -{" "}
                <Link href="https://t.co/xbpIMKzupX">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                &apos;Trump is a real one bro!&apos; &apos;NOW — VP Harris DIALS
                UP Her Dangerous Rhetoric, Compares Trump to Hitler&apos; -{" "}
                <Link href="https://t.co/SAa2xzmJZN">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Full Segment:{" "}
                <Link href="https://t.co/XmdrehyMwb">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>Translation: “We need more Democrat votes”</li>
              <li>
                Full Episode:{" "}
                <Link href="https://t.co/z4msj3IHAC">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Full Episode:{" "}
                <Link href="https://t.co/Mk7XiRI71y">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                RT @RoundtableSpace: Bukele&apos;s Using Bitcoin To Build
                Schools In Honduras
              </li>
              <li>
                RT @MarioNawfal: 🚨🇺🇸 TESLA STOCK SURGES 12% ON EARNINGS BEAT
              </li>
              <li>
                RT @MarioNawfal: 🚨🇺🇸FORMER TEXAS COP SENTENCED TO 10 YEARS FOR
                RUNNING HUMAN SMUGGLING STASH HOUSES
              </li>
              <li>
                RT @MarioNawfal: 🚨OZEMPIC & WEGOVY MAKER SUES TO STOP
                COMPOUNDING PHARMACIES FROM MAKING CHEAPER VERSIONS
              </li>
              <li>
                RT @MarioNawfal: 🇺🇸TRUMP: ARE YOU BETTER OFF NOW THAN YOU WERE
                FOUR YEARS AGO
              </li>
            </ul>

            {/* Top 15 Tweets */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">
              Top 15 Tweets of Today
            </h4>
            <ul className="list-disc pl-6">
              <li>
                New poll: Trump is getting record levels of support among young
                Black and Latino men.
                <Link href="https://t.co/mrA3nzEA0Z">
                  &nbsp;@Politico 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                The pharmaceutical industry says there is sufficient oversight
                over its work, but COVID proved there isn&apos;t. Now, a
                bestselling new book by @SharylAttkisson documents how Big
                Pharma exercises undue influence over media, medicine, and even
                medical textbooks.
                <Link href="https://t.co/1nqfb4qsjF">
                  &nbsp;@shellenberger 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                Tax brackets 2025: IRS releases inflation adjustments for next
                year.
                <Link href="https://t.co/DGMxlRRx3l">
                  &nbsp;@axios 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                The media, governments, & &quot;NGOs&quot; say they just want
                less misinfo & hate speech on X, but they don&apos;t. What they
                want is to control X in order to engage in mass censorship along
                political and ideological lines. And if they can&apos;t have
                that, to kill it.
                <Link href="https://t.co/GNFLs1Q1Dv">
                  &nbsp;@Shellenberger 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                Harris says she believes Trump is a fascist at CNN town hall.
                <Link href="https://t.co/N7HJVxOcOK">
                  &nbsp;@Axios 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                BILL ACKMAN: &quot;Vice President Harris puts stuff out about
                Trump that are absolutely, completely false....Just take a look
                at her 𝕏 feed. It&apos;s a series of lies about President
                Trump.&quot;
                <Link href="https://t.co/sCDyxi8xS5">
                  &nbsp;@TheChiefNerd 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                Justice Department warns Elon Musk’s America PAC that his $1
                million sweepstakes for registered voters in swing states may be
                illegal, sources say.
                <Link href="https://t.co/Eycn518kjv">
                  &nbsp;@CNN 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                Attack at Turkish aviation company causes deaths, says minister.
                <Link href="https://t.co/5RogqgZp6M">
                  &nbsp;@BBCWorld 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                The Georgia secretary of state&apos;s office said it had fended
                off a cyberattack aimed at crashing the website the state&apos;s
                voters use to request absentee ballots.
                <Link href="https://t.co/nmqC98sOWb">
                  &nbsp;@Reuters 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                The Justice Department sent a letter to the super PAC founded by
                Elon Musk warning that awarding $1 million to registered voters
                who signed a petition might violate federal laws against paying
                voters, according to people with knowledge of the situation.
                <Link href="https://t.co/vMSojHpN7y">
                  &nbsp;@NYTimes 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                🇰🇵🇷🇺10,000 NORTH KOREAN TROOPS TO JOIN RUSSIA&apos;S WAR IN
                UKRAINE BY DECEMBER. South Korea&apos;s National Intelligence
                Service (NIS) reports that 3,000 North Korean soldiers have
                already been deployed to Russia, with 10,000 total expected by
                December to support Russia’s war in Ukraine.
                <Link href="https://t.co/WWVsIRG9QM">
                  &nbsp;@MarioNawfal 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                NEW: Theo Von podcast listeners are mindblown to find out that
                JD Vance is not actually weird after the media ran a
                &quot;weird&quot; campaign against him for months.Another media
                hoax. Shocker.
                <Link href="https://t.co/gyA6l06Usd">
                  &nbsp;@CollinRugg 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                BREAKING: Turkish military has started striking Kurdish militant
                targets in Syria and Iraq.
                <Link href="https://t.co/GuCEAOVTSf">
                  &nbsp;@spectatorindex 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                Elon Musk’s $1m giveaway to American voters is dangerous for
                democracy. It looks certain to spawn imitators in 2028 and other
                future elections.
                <Link href="https://t.co/GuCEAOVTSf">
                  &nbsp;@TheEconomist 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
              <li>
                These people don&apos;t realize how much the whole country
                despises them.
                <Link href="https://t.co/Noahpinion">
                  &nbsp;@Noahpinion 👉
                  <span className="text-blue-500 ml-2">Tweet</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter 3 */}
          <div className="mb-10 p-8 bg-gray-100 rounded-lg shadow-lg">
            <h3 className="text-3xl font-bold text-gray-800 mb-6">
              Newsletter 3:
            </h3>

            {/* Politics Section */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">
              Politics
            </h4>
            <ul className="list-disc pl-6 mb-6">
              <li>
                Harris attacks Trump as a fascist, citing former Trump
                officials. -{" "}
                <Link href="https://t.co/4iKPh3mlCU">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Trump gains ground on Harris, according to new WSJ poll. -{" "}
                <Link href="https://t.co/fUBlHlSvDb">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Kamala Harris is turning to an unlikely group of character
                witnesses in her final pitch to voters: her opponent&apos;s
                former White House advisers. -{" "}
                <Link href="https://t.co/kwHLScNgRi">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                North Korean troops are being trained in Russia and might be
                used to reinforce Moscow&apos;s military offensive in Ukraine,
                the U.S. says. -{" "}
                <Link href="https://t.co/rcZkLOQYFE">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Elon Musk&apos;s $1 million cash giveaways to swing-state voters
                have prompted a warning from the Justice Department that they
                might violate federal law. -{" "}
                <Link href="https://t.co/meiO3fmkjW">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                23 Nobel laureates in Economics warn against Trump&apos;s
                economic policies. -{" "}
                <Link href="https://t.co/6LWZI3csmp">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
            </ul>

            {/* Geopolitics Section */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">
              Geopolitics
            </h4>
            <ul className="list-disc pl-6 mb-6">
              <li>
                Multiple people are dead and injured following an Israeli
                airstrike in southern Beirut. -{" "}
                <Link href="https://t.co/qIDONRXVc9">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Turkey has placed the blame for today&apos;s terrorist attack on
                the headquarters of the Turkish Aerospace Industries in Ankara,
                which resulted in 5 deaths and over 20 injuries, on the
                Kurdistan Workers&apos; Party also known as PKK. -{" "}
                <Link href="https://t.co/7hXMqPneku">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                The floor of a building near the Iranian Embassy in southern
                Beirut, which was targeted by an Israeli airstrike, was totally
                destroyed. -{" "}
                <Link href="https://t.co/fKRU6haaML">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                U.S. Secretary of Defense, Lloyd Austin confirmed earlier today
                that North Korea had deployed several Thousand Troops to Russia.
                -{" "}
                <Link href="https://t.co/ec3LYbBEj2">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Explosions and Air Defense Activity reported over the Syrian
                Capital of Damascus. -{" "}
                <Link href="https://t.co/QASL6BA7O3">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
            </ul>

            {/* Finance Section */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">
              Finance
            </h4>
            <ul className="list-disc pl-6 mb-6">
              <li>
                Boeing workers on strike reject proposed agreement. -{" "}
                <Link href="https://t.co/hgE6xe9dNa">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Japanese finance minister emphasizes the importance of stable FX
                movements that reflect underlying fundamentals. -{" "}
                <Link href="https://t.co/H3C1gYFraa">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                PBOC sets USD/ CNY reference rate for today at 7.1286 (vs.
                estimate at 7.1284). -{" "}
                <Link href="https://t.co/2TekEzi2mu">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                U.S. stocks extend fall, S&P 500 down 1.00 pct. -{" "}
                <Link href="https://t.co/KGVBvJJQtA">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Morgan Stanley sounds downbeat for S&P 500 in 2025. -{" "}
                <Link href="https://t.co/KGVBvJJQtA">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                ECB chief economist Philip Lane speaks again on Thursday. -{" "}
                <Link href="https://t.co/2XhLjhfX0Z">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
            </ul>

            {/* Tech Section */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">Tech</h4>
            <ul className="list-disc pl-6 mb-6">
              <li>
                Introducing sCMs: Our latest consistency models with a
                simplified formulation, improved training stability, and
                scalability. -{" "}
                <Link href="https://t.co/rHHSE95sjo">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Tesla was right when he said this. Life is mostly about energy
                and vibes. -{" "}
                <Link href="https://t.co/3UcLxACtg2">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Something special about the Falcon Heavy simultaneous side
                booster landings. -{" "}
                <Link href="https://t.co/KPXrvtw5jN">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Starship will lengthen in the next few years. -{" "}
                <Link href="https://t.co/rHHSE95sjo">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Progress towards real-time generation from multimodal models: -{" "}
                <Link href="https://t.co/rHHSE95sjo">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
            </ul>

            {/* AI Section */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">AI</h4>
            <ul className="list-disc pl-6 mb-6">
              <li>
                AI is becoming &quot;more closed, much less collaborative, much
                less science-driven&quot;. -{" "}
                <Link href="https://t.co/yUvtx2PVAb">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                Some people have lost their titles or jobs due to plagiarism,
                e.g., Harvard&apos;s former president. But after this
                #NobelPrizeinPhysics2024, how can advisors now continue to tell
                their students that they should avoid plagiarism at all costs? -{" "}
                <Link href="https://t.co/kC8VsySYNN">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
              <li>
                AI is struggling? -{" "}
                <Link href="https://t.co/jfdYnyUuQY">
                  <span className="text-blue-500">Link</span>
                </Link>
              </li>
            </ul>

            {/* Top 15 Tweets */}
            <h4 className="text-2xl font-semibold text-gray-800 mb-4">
              Top 15 Tweets of Today
            </h4>
            <ul className="list-disc pl-6">
              <li>
                New poll: Trump is getting record levels of support among young
                Black and Latino men -{" "}
                <Link href="https://t.co/mrA3nzEA0Z">
                  &nbsp;@Politico 👉
                  <span className="text-blue-500"> Tweet</span>
                </Link>
              </li>
              <li>
                The pharmaceutical industry says there is sufficient oversight
                over its work, but COVID proved there isn&apos;t. Now, a
                bestselling new book by @SharylAttkisson documents how Big
                Pharma exercises undue influence over media, medicine, and even
                medical textbooks. -{" "}
                <Link href="https://t.co/1nqfb4qsjF">
                  &nbsp;@shellenberger 👉
                  <span className="text-blue-500">Tweet</span>
                </Link>
              </li>
              <li>
                Tax brackets 2025: IRS releases inflation adjustments for next
                year -{" "}
                <Link href="https://t.co/DGMxlRRx3l">
                  &nbsp;@axios 👉
                  <span className="text-blue-500">Tweet</span>
                </Link>
              </li>
              <li>
                The media, governments, & &quot;NGOs&quot; say they just want
                less misinfo & hate speech on X, but they don&apos;t. What they
                want is to control X in order to engage in mass censorship along
                political and ideological lines. And if they can&apos;t have
                that, to kill it. -{" "}
                <Link href="https://t.co/GNFLs1Q1Dv">
                  &nbsp;@shellenberger 👉
                  <span className="text-blue-500">Tweet</span>
                </Link>
              </li>
              <li>
                Harris says she believes Trump is a fascist at CNN town hall -{" "}
                <Link href="https://t.co/N7HJVxOcOK">
                  &nbsp;@Axios 👉
                  <span className="text-blue-500">Tweet</span>
                </Link>
              </li>
              <li>
                BILL ACKMAN: &quot;Vice President Harris puts stuff out about
                Trump that are absolutely, completely false....Just take a look
                at her 𝕏 feed. It&apos;s a series of lies about President
                Trump.&quot; -{" "}
                <Link href="https://t.co/sCDyxi8xS5">
                  &nbsp;@TheChiefNerd 👉
                  <span className="text-blue-500">Tweet</span>
                </Link>
              </li>
              <li>
                Justice Department warns Elon Musk’s America PAC that his $1
                million sweepstakes for registered voters in swing states may be
                illegal, sources say. -{" "}
                <Link href="https://t.co/Eycn518kjv">
                  &nbsp;@CNN 👉
                  <span className="text-blue-500">Tweet</span>
                </Link>
              </li>
              <li>
                Attack at Turkish aviation company causes deaths, says minister
                -{" "}
                <Link href="https://t.co/5RogqgZp6M">
                  &nbsp;@BBCWorld 👉
                  <span className="text-blue-500">Tweet</span>
                </Link>
              </li>
              <li>
                The Georgia secretary of state&apos;s office said it had fended
                off a cyberattack aimed at crashing the website the state&apos;s
                voters use to request absentee ballots -{" "}
                <Link href="https://t.co/nmqC98sOWb">
                  &nbsp;@Reuters 👉
                  <span className="text-blue-500">Tweet</span>
                </Link>
              </li>
              <li>
                The Justice Department sent a letter to the super PAC founded by
                Elon Musk warning that awarding $1 million to registered voters
                who signed a petition might violate federal laws against paying
                voters, according to people with knowledge of the situation. -{" "}
                <Link href="https://t.co/vMSojHpN7y">
                  &nbsp;@NYTimes 👉
                  <span className="text-blue-500">Tweet</span>
                </Link>
              </li>
              <li>
                🇰🇵🇷🇺10,000 NORTH KOREAN TROOPS TO JOIN RUSSIA&apos;S WAR IN
                UKRAINE BY DECEMBER. South Korea&apos;s National Intelligence
                Service (NIS) reports that 3,000 North Korean soldiers have
                already been deployed to Russia, with 10,000 total expected by
                December to support Russia’s war in Ukraine. -{" "}
                <Link href="https://t.co/WWVsIRG9QM">
                  &nbsp;@MarioNawfal 👉
                  <span className="text-blue-500">Tweet</span>
                </Link>
              </li>
              <li>
                NEW: Theo Von podcast listeners are mindblown to find out that
                JD Vance is not actually weird after the media ran a
                &quot;weird&quot; campaign against him for months.Another media
                hoax. Shocker. -{" "}
                <Link href="https://t.co/gyA6l06Usd">
                  &nbsp;@CollinRugg 👉
                  <span className="text-blue-500">Tweet</span>
                </Link>
              </li>
              <li>
                BREAKING: Turkish military has started striking Kurdish militant
                targets in Syria and Iraq -{" "}
                <Link href="https://t.co/GuCEAOVTSf">
                  &nbsp;@spectatorindex 👉
                  <span className="text-blue-500">Tweet</span>
                </Link>
              </li>
              <li>
                Elon Musk’s $1m giveaway to American voters is dangerous for
                democracy. It looks certain to spawn imitators in 2028 and other
                future elections. -{" "}
                <Link href="https://t.co/GuCEAOVTSf">
                  &nbsp;@TheEconomist 👉
                  <span className="text-blue-500"> Tweet</span>
                </Link>
              </li>
              <li>
                These people don&apos;t realize how much the whole country
                despises them. -{" "}
                <Link href="https://t.co/Noahpinion">
                  &nbsp;@Noahpinion 👉
                  <span className="text-blue-500">Tweet</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
