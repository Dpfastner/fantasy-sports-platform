import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to text-text-primary">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            Rivyls
          </h1>
          <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
            Draft your favorite college football teams, compete with friends,
            and track real-time scores throughout the season.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-brand hover:bg-brand-hover text-text-primary font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="bg-surface hover:bg-surface-subtle text-text-primary font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-surface p-6 rounded-lg">
            <div className="text-3xl mb-4">🏈</div>
            <h3 className="text-xl font-semibold mb-2">Live Draft</h3>
            <p className="text-text-secondary">
              Real-time snake or linear drafts with customizable timers.
              Draft with your friends from anywhere.
            </p>
          </div>
          <div className="bg-surface p-6 rounded-lg">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Live Scoring</h3>
            <p className="text-text-secondary">
              Watch your points update in real-time as games unfold.
              Track every touchdown and upset.
            </p>
          </div>
          <div className="bg-surface p-6 rounded-lg">
            <div className="text-3xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold mb-2">Weekly High Points</h3>
            <p className="text-text-secondary">
              Compete for weekly prizes. Every week is a new chance to win,
              keeping the excitement all season long.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold mb-2">Create or Join a League</h4>
              <p className="text-text-secondary text-sm">
                Start your own league or join one with an invite code
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold mb-2">Draft Your Team</h4>
              <p className="text-text-secondary text-sm">
                Select college football programs to represent your team
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold mb-2">Earn Points</h4>
              <p className="text-text-secondary text-sm">
                Your schools earn points for wins, ranked victories, and more
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                4
              </div>
              <h4 className="font-semibold mb-2">Win Prizes</h4>
              <p className="text-text-secondary text-sm">
                Compete for weekly high points and the overall championship
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-highlight-row rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Start Your League?
          </h2>
          <p className="text-text-secondary mb-6">
            Join thousands of fans competing in the ultimate college football fantasy experience.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-brand hover:bg-brand-hover text-text-primary font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Create Your Free Account
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-text-secondary">
          <p>&copy; 2025 Rivyls. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
