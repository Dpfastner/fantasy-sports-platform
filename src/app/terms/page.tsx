import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Rivyls',
  description: 'Rivyls Terms of Service. Read our terms governing your use of the Rivyls fantasy sports platform.',
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-page text-text-primary">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-page/90 backdrop-blur-sm border-b border-border-subtle">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="brand-nav text-xl tracking-wide">
            RIVYLS
          </Link>
          <Link href="/welcome" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
            Back to site
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-8 pb-4 border-b border-border">
          <h1 className="text-2xl font-bold mb-1">Terms of Service</h1>
          <div className="text-sm text-text-muted">
            <span className="mr-4">Effective Date: April 1, 2026</span>
            <span>Last Updated: April 1, 2026</span>
          </div>
        </div>

        <div className="legal-content">
          <div className="notice">
            IMPORTANT: PLEASE READ THESE TERMS OF SERVICE CAREFULLY BEFORE USING RIVYLS. THESE TERMS AFFECT YOUR LEGAL RIGHTS AND OBLIGATIONS, INCLUDING A BINDING ARBITRATION CLAUSE AND CLASS ACTION WAIVER IN SECTION 18. BY CREATING AN ACCOUNT OR USING OUR SERVICES, YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE, DO NOT USE THE SERVICES.
          </div>

          <h2>1. Agreement to Terms</h2>
          <p>These Terms of Service (&ldquo;Terms,&rdquo; &ldquo;Agreement,&rdquo; or &ldquo;ToS&rdquo;) constitute a legally binding agreement between you (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and Rivyls LLC, a Georgia limited liability company (&ldquo;Rivyls,&rdquo; &ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). These Terms govern your access to and use of the Rivyls website located at www.rivyls.com (the &ldquo;Site&rdquo;), any related mobile applications (the &ldquo;App&rdquo;), and all related content, features, functionality, products, and services offered by Rivyls (collectively, the &ldquo;Services&rdquo;).</p>
          <p>By accessing, browsing, or using the Services, creating an account, or clicking any button or checkbox indicating your acceptance, you acknowledge that you have read, understood, and agree to be bound by these Terms, our <Link href="/privacy" className="text-brand-text hover:underline">Privacy Policy</Link>, our Game Rules, and any additional terms, guidelines, or rules referenced herein or made available through the Services (collectively, the &ldquo;Agreements&rdquo;). The Agreements collectively form the entire agreement between you and Rivyls regarding the Services.</p>
          <p>If you are using the Services on behalf of an organization or entity, you represent and warrant that you have the authority to bind that organization to these Terms, and you agree to these Terms on behalf of that organization.</p>

          <h2>2. Modifications to Terms</h2>
          <p>Rivyls reserves the right to modify, amend, or update these Terms at any time, in our sole discretion. When we make material changes, we will notify you by posting the updated Terms on the Site with a revised &ldquo;Last Updated&rdquo; date and, where required by law, by sending notice to the email address associated with your account or through an in-app notification.</p>
          <p>Your continued use of the Services after the posting of revised Terms constitutes your acceptance of and agreement to the updated Terms. If you do not agree to the revised Terms, you must stop using the Services and close your account. It is your responsibility to review these Terms periodically for changes.</p>

          <h2>3. Eligibility</h2>
          <h3>3.1 Age Requirement</h3>
          <p>You must be at least eighteen (18) years of age to create an account and use the Services. By creating an account, you represent and warrant that you are at least 18 years old. Rivyls may require you to verify your age at any time, and failure to verify may result in the suspension or termination of your account.</p>
          <p>Although the Services are currently offered free of charge and do not involve real-money entry fees, wagering, or cash prizes, Rivyls maintains the 18-year minimum age requirement to ensure a mature user experience and to comply with general internet platform standards. In jurisdictions where the minimum age for using internet services is higher than 18, you must meet the higher age requirement applicable to your jurisdiction. If Rivyls introduces paid-entry contests or cash-prize features in the future, additional age requirements may apply based on the laws of specific states or jurisdictions, and those requirements will be disclosed at that time.</p>
          <h3>3.2 Legal Capacity</h3>
          <p>You represent and warrant that you have the legal capacity and authority to enter into a binding agreement and to use the Services in accordance with all applicable laws and regulations. You are solely responsible for ensuring that your use of the Services complies with all laws, rules, and regulations applicable to you in your jurisdiction.</p>
          <h3>3.3 Geographic Availability</h3>
          <p>The Services are currently available to users located in all fifty (50) United States, the District of Columbia, and United States territories. Because the Services are provided free of charge and do not involve real-money entry fees, wagering, cash prizes, or paid-entry daily fantasy sports (&ldquo;DFS&rdquo;) contests, the state-level restrictions that apply to paid DFS operators do not apply to Rivyls at this time.</p>
          <p>The Services operate as a free-to-play entertainment platform in the same regulatory category as other free fantasy league hosting services (such as free leagues on ESPN, Yahoo Fantasy, or Sleeper&rsquo;s free tier), which are available nationwide without state-specific restrictions.</p>
          <p>Notwithstanding the foregoing, Rivyls reserves the right to restrict, limit, or discontinue access to the Services in any jurisdiction at any time, in our sole discretion, including but not limited to situations where: (a) changes in applicable law or regulation require such restriction; (b) Rivyls introduces paid-entry contests, cash prizes, or premium features that trigger jurisdiction-specific licensing or regulatory requirements; or (c) Rivyls determines that restriction is otherwise necessary or appropriate.</p>
          <p>You are responsible for compliance with local laws in your jurisdiction. Use of the Services from outside the United States is at your own risk, and you are solely responsible for compliance with the laws of your country or territory.</p>
          <h3>3.4 Account Restrictions</h3>
          <p>The following individuals are not eligible to use the Services: (a) anyone who has been previously banned or suspended from the Services by Rivyls; (b) anyone who does not meet the age requirements stated above; (c) anyone who is legally prohibited from using such services in their jurisdiction; or (d) any employee, officer, director, or contractor of Rivyls or its affiliates, except in limited circumstances as permitted by Company policy.</p>

          <h2>4. Description of Services</h2>
          <h3>4.1 Platform Overview</h3>
          <p>Rivyls is a fantasy sports entertainment platform that allows users to participate in fantasy leagues where they draft entire sports programs (e.g., college football teams/schools) rather than individual players. Users earn points based on the real-world performance of their selected programs, including but not limited to wins, ranked opponent victories, shutouts, conference championships, and playoff appearances.</p>
          <h3>4.2 Entertainment Purpose and Regulatory Classification</h3>
          <p>The Services are provided solely for entertainment, recreation, and amusement purposes. Rivyls is classified under NAICS Code 713990 (All Other Amusement and Recreation Industries) and operates exclusively as an entertainment and recreation service. The Services are not gambling, sports betting, wagering, or games of chance. Rivyls does not operate a sportsbook, casino, or any form of regulated gaming activity.</p>
          <p>Fantasy sports contests offered through the Services are games of skill. The outcome of leagues and contests is determined predominantly by the knowledge, attention, experience, research, and skill of the participants in selecting and managing their drafted programs throughout the season.</p>
          <h3>4.3 Free Platform; No Entry Fees; No Cash Prizes</h3>
          <div className="notice">
            THE SERVICES ARE CURRENTLY PROVIDED ENTIRELY FREE OF CHARGE. RIVYLS DOES NOT CHARGE ENTRY FEES, REQUIRE DEPOSITS, COLLECT WAGERS, OR AWARD CASH PRIZES OR ANY OTHER MONETARY COMPENSATION IN CONNECTION WITH ANY LEAGUE, CONTEST, OR FEATURE ON THE PLATFORM.
          </div>
          <p>All leagues, drafts, scoring, leaderboards, and other features of the Services are offered at no cost to users. There is no purchase necessary to create an Account, join or create a league, participate in a draft, or use any feature of the Services. Users do not stake, risk, wager, or deposit any money, cryptocurrency, or other thing of value to participate in any aspect of the Services.</p>
          <p>The Services are not daily fantasy sports contests as defined under the Unlawful Internet Gambling Enforcement Act of 2006 (UIGEA) or any state DFS statute, because: (a) no entry fees or consideration of any kind are charged; (b) no cash prizes, monetary awards, or items of monetary value are offered or distributed; (c) there is no &ldquo;house&rdquo; that participants play against; and (d) no financial transaction of any kind is required to participate.</p>
          <h3>4.4 Future Premium Services</h3>
          <p>In the future, Rivyls may introduce optional premium subscription services (&ldquo;Rivyls Pro&rdquo;) that provide enhanced features, tools, and functionality in exchange for a monthly or annual subscription fee. Any such premium subscription would constitute payment for access to enhanced software features and platform tools, and would not constitute an entry fee for a contest, a wager, or a deposit into a prize pool.</p>
          <p>Any premium services will be subject to separate or supplemental terms, including pricing, billing, cancellation, and refund policies, which will be clearly presented to you before purchase.</p>
          <h3>4.5 Future Paid Contests Disclaimer</h3>
          <p>If Rivyls introduces paid-entry contests, cash prizes, or any features that involve real-money transactions in the future, such features will: (a) be clearly disclosed and distinguished from free features; (b) be subject to all applicable federal and state laws and regulations; (c) include geographic restrictions as required by the laws of specific jurisdictions; (d) be accompanied by supplemental terms of service specific to those features; and (e) require additional user consent and, where applicable, age and identity verification.</p>

          <h2>5. Account Registration and Security</h2>
          <h3>5.1 Account Creation</h3>
          <p>To access certain features of the Services, you must create an account (&ldquo;Account&rdquo;). When creating your Account, you agree to: (a) provide accurate, current, and complete information as prompted by the registration form; (b) maintain and promptly update your Account information to keep it accurate, current, and complete; and (c) maintain the security of your Account by not sharing your password with any third party and by restricting access to your Account.</p>
          <h3>5.2 One Account Per Person</h3>
          <p>You may create and maintain only one (1) Account. If Rivyls discovers that you have created or are operating multiple Accounts, we reserve the right to suspend or terminate any or all of your Accounts.</p>
          <h3>5.3 Account Security</h3>
          <p>You are solely responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your Account. You agree to immediately notify Rivyls of any unauthorized use of your Account by contacting us at legal@rivyls.com.</p>
          <h3>5.4 Account Deletion</h3>
          <p>You may request deletion of your Account at any time by navigating to your Account settings and selecting the &ldquo;Delete Account&rdquo; option, or by contacting us at legal@rivyls.com. Upon receiving a valid deletion request, Rivyls will: (a) deactivate your Account within a reasonable timeframe; (b) delete or anonymize your personal information in accordance with our Privacy Policy and applicable law; and (c) remove your participation from any active leagues.</p>

          <h2>6. User Conduct and Code of Conduct</h2>
          <h3>6.1 Acceptable Use</h3>
          <p>You agree to use the Services only for lawful purposes and in accordance with these Terms. You agree not to use the Services in any way that: (a) violates any applicable federal, state, local, or international law or regulation; (b) exploits, harms, or attempts to exploit or harm minors in any way; (c) transmits any material that is defamatory, obscene, threatening, abusive, harassing, hateful, or racially or ethnically objectionable; or (d) infringes upon or violates the intellectual property rights or other rights of any third party.</p>
          <h3>6.2 Prohibited Activities</h3>
          <p>You agree not to: (a) create multiple Accounts or use another person&rsquo;s Account without permission; (b) use any automated means to access or interact with the Services; (c) attempt to gain unauthorized access to the Services or other Accounts; (d) interfere with or disrupt the Services; (e) transmit any viruses, worms, or malware; (f) reverse engineer or decompile the Services; (g) circumvent security features; (h) engage in match-fixing, collusion, or cheating; (i) use insider or non-public information; (j) engage in fraud or misrepresentation; or (k) encourage any of the foregoing.</p>
          <h3>6.3 Fair Play</h3>
          <p>Rivyls is committed to maintaining the integrity of all contests. Users must make independent decisions regarding their teams and strategy. Collusion, multi-accounting, or any coordinated effort to manipulate the outcome of a contest is strictly prohibited.</p>
          <h3>6.4 User-Generated Content</h3>
          <p>The Services may allow you to post, submit, or share content (&ldquo;User Content&rdquo;). You retain ownership of your User Content, but by submitting it, you grant Rivyls a non-exclusive, worldwide, royalty-free, perpetual, irrevocable, sublicensable, and transferable license to use, reproduce, modify, adapt, publish, translate, distribute, and display such User Content in connection with the Services.</p>

          <h2>7. Intellectual Property Rights</h2>
          <h3>7.1 Rivyls Property</h3>
          <p>The Services and all content, features, and functionality thereof are owned by Rivyls, its licensors, or other providers and are protected by United States and international intellectual property laws.</p>
          <h3>7.2 Limited License</h3>
          <p>Subject to your compliance with these Terms, Rivyls grants you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the Services for your personal, non-commercial use.</p>
          <h3>7.3 Third-Party Intellectual Property</h3>
          <p>The Services may display trademarks, logos, and other intellectual property belonging to third parties, including collegiate sports programs, conferences, and sports organizations. Such third-party marks are the property of their respective owners. Rivyls is not affiliated with, endorsed by, or sponsored by the NCAA, any college, university, conference, or any other sports organization unless expressly stated.</p>

          <h2>8. Third-Party Services and Content</h2>
          <p>The Services may contain links to, integrate with, or rely upon third-party websites, services, or content. Rivyls does not control, endorse, or assume responsibility for any Third-Party Services. The Services utilize third-party sports data feeds and APIs to provide scoring and game results. Rivyls does not guarantee the accuracy, completeness, or timeliness of any data provided by third-party sources.</p>

          <h2>9. Disclaimers of Warranties</h2>
          <p className="uppercase font-semibold">THE SERVICES ARE PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY.</p>
          <p>To the fullest extent permitted by applicable law, Rivyls expressly disclaims all warranties of any kind, whether express, implied, statutory, or otherwise, including but not limited to any warranties of merchantability, fitness for a particular purpose, title, non-infringement, accuracy, completeness, reliability, security, or compatibility.</p>

          <h2>10. Limitation of Liability</h2>
          <p className="uppercase font-semibold">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL RIVYLS, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, SUCCESSORS, OR ASSIGNS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICES.</p>
          <p>In no event shall Rivyls&rsquo; total aggregate liability to you for all claims arising out of or related to the Services exceed the greater of: (a) the total amount you have paid to Rivyls in the twelve (12) months immediately preceding the event giving rise to the claim; or (b) one hundred United States dollars ($100.00).</p>

          <h2>11. Indemnification</h2>
          <p>You agree to indemnify, defend, and hold harmless Rivyls, its affiliates, and their respective officers, directors, employees, agents, successors, and assigns from and against any and all claims, demands, actions, suits, proceedings, losses, liabilities, damages, costs, and expenses arising out of or related to: (a) your use of the Services; (b) your violation of these Terms; (c) your violation of any rights of a third party; (d) any User Content you submit; or (e) any negligent, reckless, or intentional wrongful act by you.</p>

          <h2>12. Termination</h2>
          <h3>12.1 Termination by You</h3>
          <p>You may terminate your Account at any time by using the Account deletion feature in your Account settings or by contacting us at legal@rivyls.com.</p>
          <h3>12.2 Termination by Rivyls</h3>
          <p>Rivyls may suspend or terminate your Account and access to the Services at any time, with or without cause, and with or without notice, in our sole discretion.</p>
          <h3>12.3 Effect of Termination</h3>
          <p>Upon termination: (a) all rights and licenses granted to you under these Terms will immediately cease; (b) you must immediately stop using the Services; (c) your access to your Account and any data therein may be permanently removed; and (d) Sections 7, 9, 10, 11, 13, 14, 15, 16, 17, 18, and 19 of these Terms shall survive termination.</p>

          <h2>13. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of the State of Georgia, United States of America, without regard to its conflict of laws provisions. Any legal action shall be brought exclusively in the state or federal courts located in Fulton County, Georgia.</p>

          <h2>14. Privacy</h2>
          <p>Your privacy is important to us. Our collection, use, and sharing of your personal information is governed by our <Link href="/privacy" className="text-brand-text hover:underline">Privacy Policy</Link>. By using the Services, you consent to the collection and use of your information as described in the Privacy Policy.</p>

          <h2>15. Electronic Communications and Consent</h2>
          <p>By creating an Account, you consent to receive electronic communications from Rivyls, including: (a) emails related to your Account; (b) service announcements, administrative messages, and legal notices; and (c) promotional offers and marketing communications. You may opt out of promotional communications at any time by following the unsubscribe instructions or by adjusting your Account settings.</p>

          <h2>16. Consent Logging and Records</h2>
          <p>Rivyls maintains records of your consent to these Terms, our Privacy Policy, and other agreements. When you create an Account, accept updated Terms, or provide consent for specific data processing activities, Rivyls will log the date, time, version of the agreement, and manner of your consent.</p>

          <h2>17. Force Majeure</h2>
          <p>Rivyls shall not be liable for any failure or delay in performing its obligations under these Terms where such failure or delay results from circumstances beyond our reasonable control.</p>

          <h2>18. Dispute Resolution and Arbitration</h2>
          <div className="notice">
            PLEASE READ THIS SECTION CAREFULLY. IT CONTAINS A BINDING ARBITRATION CLAUSE AND CLASS ACTION WAIVER THAT AFFECT YOUR LEGAL RIGHTS.
          </div>
          <h3>18.1 Informal Resolution</h3>
          <p>Before initiating any arbitration or court proceeding, you and Rivyls agree to first attempt to resolve any dispute informally. You agree to send a written notice of your dispute to legal@rivyls.com. Rivyls will attempt to resolve the dispute within sixty (60) days.</p>
          <h3>18.2 Binding Arbitration</h3>
          <p>If a dispute cannot be resolved informally, you and Rivyls agree that any dispute shall be resolved exclusively through final and binding individual arbitration, administered by the American Arbitration Association (&ldquo;AAA&rdquo;) under its Consumer Arbitration Rules.</p>
          <h3>18.3 Class Action Waiver</h3>
          <p className="uppercase font-semibold">YOU AND RIVYLS AGREE THAT EACH PARTY MAY BRING DISPUTES AGAINST THE OTHER ONLY IN AN INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING.</p>
          <h3>18.4 Opt-Out Right</h3>
          <p>You have the right to opt out of binding arbitration by sending written notice to legal@rivyls.com within thirty (30) days of first accepting these Terms.</p>
          <h3>18.5 Costs of Arbitration</h3>
          <p>If your claim is for less than $10,000, Rivyls will reimburse your filing fee and pay the AAA&rsquo;s administration and arbitrator fees.</p>
          <h3>18.6 Time Limitation on Claims</h3>
          <p>Any dispute must be filed within one (1) year after the date the party asserting the claim first knows or reasonably should know of the act giving rise to the claim.</p>

          <h2>19. General Provisions</h2>
          <h3>19.1 Entire Agreement</h3>
          <p>These Terms, together with the Privacy Policy, Game Rules, and any other agreements expressly referenced herein, constitute the entire agreement between you and Rivyls regarding the Services.</p>
          <h3>19.2 Severability</h3>
          <p>If any provision of these Terms is found to be invalid, illegal, or unenforceable, the remaining provisions shall remain in full force and effect.</p>
          <h3>19.3 Waiver</h3>
          <p>The failure of Rivyls to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.</p>
          <h3>19.4 Assignment</h3>
          <p>You may not assign or transfer these Terms without the prior written consent of Rivyls. Rivyls may freely assign or transfer these Terms.</p>
          <h3>19.5 Notices</h3>
          <p>Rivyls may send you notices through the Services, by email, or by any other method permitted by law. You may send notices to legal@rivyls.com.</p>

          <h2>20. Contact Information</h2>
          <p>If you have any questions, concerns, or feedback about these Terms or the Services, please contact us at:</p>
          <div className="my-3 leading-loose">
            <strong className="block">Rivyls LLC</strong>
            Email: legal@rivyls.com<br />
            Website: www.rivyls.com<br />
            Mailing Address: 1012 Palmetto Ave SW, Atlanta, GA 30314
          </div>

          <p className="mt-8 pt-4 border-t border-border text-sm text-text-muted italic">
            By using the Services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
        </div>
      </main>

    </div>
  )
}
