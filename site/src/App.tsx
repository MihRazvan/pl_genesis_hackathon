import {
  ArrowRight,
  Copy,
  EyeOff,
  Link2Off,
  Network,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useState } from "react";

const rpcConfig = {
  chainId: "0xaa36a7",
  chainName: "Sepolia via Cloakline",
  rpcUrls: ["https://rpc.cloakline.xyz/sepolia"],
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18
  },
  blockExplorerUrls: ["https://sepolia.etherscan.io"]
};

const manualFields = [
  { label: "Network Name", value: "Sepolia via Cloakline" },
  { label: "New RPC URL", value: "https://rpc.cloakline.xyz/sepolia" },
  { label: "Chain ID", value: "11155111" },
  { label: "Currency Symbol", value: "ETH" },
  { label: "Block Explorer URL", value: "https://sepolia.etherscan.io" }
];

const faqs = [
  {
    question: "What does Cloakline actually do?",
    answer:
      "Cloakline is a drop-in Ethereum RPC that sits between your wallet and the upstream provider. It reduces direct provider-side linkage and writes selected usage signals on-chain as encrypted counts tied to salted pseudonymous bucket IDs."
  },
  {
    question: "What is protected?",
    answer:
      "Upstream providers no longer see the direct client-to-provider connection, and the on-chain logging layer does not store raw wallet addresses. Logged counts are encrypted and the logger is write-only."
  },
  {
    question: "What is not protected?",
    answer:
      "The Cloakline proxy still sees live metadata while forwarding requests. This MVP is about unlinkability and dossier-risk reduction, not full anonymity."
  },
  {
    question: "Why use Zama here?",
    answer:
      "fhEVM gives us encrypted on-chain counters and access control. Cloakline can write operational data on-chain, but it cannot decrypt the accumulated history later."
  },
  {
    question: "Is this a new wallet?",
    answer:
      "No. The goal is one-click adoption: add one RPC endpoint to your existing wallet and keep the normal flow."
  }
];

function App() {
  const [copyState, setCopyState] = useState<string | null>(null);
  const [walletState, setWalletState] = useState<string | null>(null);

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(label);
      window.setTimeout(() => setCopyState(null), 1400);
    } catch {
      setCopyState(`Copy ${label} failed`);
      window.setTimeout(() => setCopyState(null), 1600);
    }
  }

  async function addToWallet() {
    const ethereum = (window as Window & {
      ethereum?: {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
    }).ethereum;

    if (!ethereum) {
      setWalletState("No injected wallet detected. Use the manual RPC details instead.");
      return;
    }

    try {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [rpcConfig]
      });
      setWalletState("Wallet request opened.");
    } catch {
      setWalletState("Wallet request was rejected or not supported.");
    }
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <a className="brand" href="#hero">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-core" />
          </span>
          <span className="brand-text">Cloakline</span>
        </a>
        <nav className="topnav" aria-label="Primary">
          <a href="#benefits">Why Cloakline</a>
          <a href="#get-started">Add RPC</a>
          <a href="#faq">FAQ</a>
        </nav>
      </header>

      <main>
        <section className="hero section-blue" id="hero">
          <div className="hero-copy">
            <p className="eyebrow">Drop-in privacy RPC for Ethereum</p>
            <h1>Reduce wallet surveillance with one RPC switch.</h1>
            <p className="hero-text">
              Cloakline routes your wallet through a privacy-preserving RPC layer and uses fhEVM
              to keep operational logging encrypted, pseudonymous, and write-only.
            </p>
            <ol className="hero-steps">
              <li>Add the Cloakline RPC to your wallet.</li>
              <li>Keep using Sepolia normally through the same wallet flow.</li>
              <li>Reduce direct provider linkage and on-chain dossier exposure.</li>
            </ol>
            <div className="hero-actions">
              <a className="button button-primary" href="#get-started">
                Add Cloakline RPC
                <ArrowRight size={20} />
              </a>
              <a className="button button-ghost" href="#benefits">
                See how it works
              </a>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-orb hero-orb-large" />
            <div className="hero-orb hero-orb-small" />
            <div className="hero-panel">
              <div className="hero-card hero-card-left">
                <p>Direct RPC</p>
                <strong>IP + wallet activity can be linked upstream</strong>
              </div>
              <div className="hero-card hero-card-right">
                <p>Cloakline</p>
                <strong>Proxy path + encrypted write-only bucket logging</strong>
              </div>
              <div className="hero-device">
                <div className="hero-device-screen">
                  <span className="hero-line hero-line-wide" />
                  <span className="hero-line" />
                  <span className="hero-line hero-line-short" />
                </div>
                <div className="hero-device-base" />
              </div>
            </div>
          </div>
        </section>

        <section className="benefits section-yellow" id="benefits">
          <div className="section-head">
            <p className="eyebrow">Why Cloakline</p>
            <h2>Simple RPC UX, stronger privacy posture.</h2>
            <p>
              Cloakline is built for one-click adoption. Judges and users should understand the
              product before they understand the cryptography.
            </p>
          </div>
          <div className="benefit-grid">
            <article className="benefit-card">
              <div className="benefit-icon sky">
                <Link2Off size={42} />
              </div>
              <h3>Break easy linkage</h3>
              <p>
                Upstream providers see proxy-origin traffic instead of the direct client path,
                making wallet-linked surveillance easier to disrupt.
              </p>
            </article>
            <article className="benefit-card">
              <div className="benefit-icon coral">
                <EyeOff size={42} />
              </div>
              <h3>Write-only logging</h3>
              <p>
                fhEVM stores encrypted counts by salted bucket ID. The logger can write, but it
                cannot decrypt what it accumulates.
              </p>
            </article>
            <article className="benefit-card">
              <div className="benefit-icon mint">
                <ShieldCheck size={42} />
              </div>
              <h3>Honest trust model</h3>
              <p>
                This MVP targets unlinkability and dossier-risk reduction. It does not pretend the
                proxy itself is invisible.
              </p>
            </article>
          </div>
        </section>

        <section className="starter section-pink" id="get-started">
          <div className="section-head">
            <p className="eyebrow">Get started</p>
            <h2>Add Cloakline to your wallet.</h2>
            <p>
              Use the wallet button if your browser wallet supports network injection, or copy the
              manual fields below. Placeholder endpoint for now, real endpoint later.
            </p>
          </div>
          <div className="starter-grid">
            <article className="starter-card">
              <div className="starter-card-head">
                <Sparkles size={20} />
                <span>One-click wallet setup</span>
              </div>
              <p className="starter-network">Sepolia via Cloakline</p>
              <button className="button button-primary button-wide" onClick={addToWallet}>
                Add to wallet
              </button>
              <p className="starter-note">
                Best for judges: show the wallet prompt, then send a normal Sepolia transaction
                through Cloakline.
              </p>
              {walletState ? <p className="status-note">{walletState}</p> : null}
            </article>

            <article className="starter-card starter-card-manual">
              <div className="starter-card-head">
                <Network size={20} />
                <span>Manual RPC details</span>
              </div>
              <dl className="field-list">
                {manualFields.map((field) => (
                  <div className="field-row" key={field.label}>
                    <dt>{field.label}</dt>
                    <dd>
                      <span>{field.value}</span>
                      <button
                        type="button"
                        className="copy-button"
                        aria-label={`Copy ${field.label}`}
                        onClick={() => copyValue(field.label, field.value)}
                      >
                        <Copy size={16} />
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
              {copyState ? <p className="status-note">{copyState}</p> : null}
            </article>
          </div>
        </section>

        <section className="details section-ivory" id="details">
          <div className="section-head narrow">
            <p className="eyebrow">Trust model</p>
            <h2>What changes when requests flow through Cloakline?</h2>
          </div>
          <div className="details-grid">
            <article className="details-panel">
              <h3>Protected</h3>
              <ul>
                <li>Upstream no longer sees the direct user-to-provider path.</li>
                <li>On-chain logging uses salted pseudonymous bucket IDs, not raw wallet addresses.</li>
                <li>Encrypted counts are stored through fhEVM with write-only logger permissions.</li>
              </ul>
            </article>
            <article className="details-panel">
              <h3>Not protected</h3>
              <ul>
                <li>The proxy still sees live metadata while forwarding requests.</li>
                <li>This MVP does not provide full anonymity or transport obfuscation.</li>
                <li>Wallet analytics outside the RPC path remain outside Cloakline’s control.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="faq section-mint" id="faq">
          <div className="section-head narrow">
            <p className="eyebrow">FAQ</p>
            <h2>Questions judges will probably ask.</h2>
          </div>
          <div className="faq-list">
            {faqs.map((item) => (
              <details className="faq-item" key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
