import {
  ArrowRight,
  Copy,
  EyeOff,
  Link2Off,
  Network,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useEffect, useState } from "react";
import { manualFields, siteConfig } from "./siteConfig";

type EthereumProvider = {
  isMetaMask?: boolean;
  isRabby?: boolean;
  providers?: EthereumProvider[];
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getInjectedProvider(): EthereumProvider | undefined {
  const maybeWindow = window as Window & {
    ethereum?: EthereumProvider;
    rabby?: { ethereum?: EthereumProvider };
  };

  if (maybeWindow.rabby?.ethereum) {
    return maybeWindow.rabby.ethereum;
  }

  const ethereum = maybeWindow.ethereum;
  if (!ethereum) {
    return undefined;
  }

  if (Array.isArray(ethereum.providers) && ethereum.providers.length > 0) {
    return (
      ethereum.providers.find((provider) => provider.isRabby) ??
      ethereum.providers.find((provider) => provider.isMetaMask) ??
      ethereum.providers[0]
    );
  }

  return ethereum;
}

const faqs = [
  {
    question: "What does Cloakline do?",
    answer:
      "Cloakline is a drop-in Ethereum RPC that sits between your wallet and the upstream provider. It reduces direct provider-side linkage and writes selected usage signals on-chain as encrypted counts tied to salted pseudonymous bucket IDs."
  },
  {
    question: "What does Cloakline protect?",
    answer:
      "Upstream providers no longer see the direct client-to-provider path, and the on-chain logging layer does not store raw wallet addresses. Logged counts are encrypted and the logger is write-only."
  },
  {
    question: "What does Cloakline not protect?",
    answer:
      "The Cloakline proxy still sees live metadata while forwarding requests. This MVP is about unlinkability and dossier-risk reduction, not full anonymity."
  },
  {
    question: "Why is Zama fhEVM part of the design?",
    answer:
      "fhEVM gives us encrypted on-chain counters and access control. Cloakline can write operational data on-chain, but it cannot decrypt the accumulated history later."
  },
  {
    question: "Do I need a new wallet?",
    answer:
      "No. The goal is one-click adoption: add one RPC endpoint to your existing wallet and keep the normal flow."
  }
];

function App() {
  const [copyState, setCopyState] = useState<string | null>(null);
  const [walletState, setWalletState] = useState<string | null>(null);
  const [provider, setProvider] = useState<EthereumProvider | undefined>(() =>
    typeof window === "undefined" ? undefined : getInjectedProvider()
  );

  useEffect(() => {
    function refreshProvider() {
      setProvider(getInjectedProvider());
    }

    refreshProvider();
    window.addEventListener("ethereum#initialized", refreshProvider as EventListener, {
      once: true
    });

    const timeoutId = window.setTimeout(refreshProvider, 800);

    return () => {
      window.removeEventListener("ethereum#initialized", refreshProvider as EventListener);
      window.clearTimeout(timeoutId);
    };
  }, []);

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
    const injectedProvider = provider ?? getInjectedProvider();

    if (!injectedProvider) {
      setWalletState(
        "No injected wallet detected. Open this page in a browser with Rabby or MetaMask enabled, or use the manual RPC details instead."
      );
      return;
    }

    try {
      await injectedProvider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: siteConfig.rpc.chainIdHex,
            chainName: siteConfig.rpc.chainName,
            rpcUrls: [siteConfig.rpc.rpcUrl],
            nativeCurrency: {
              name: siteConfig.rpc.currencyName,
              symbol: siteConfig.rpc.currencySymbol,
              decimals: 18
            },
            blockExplorerUrls: [siteConfig.rpc.explorerUrl]
          }
        ]
      });
      setWalletState("Wallet request opened. Check your wallet extension.");
    } catch {
      setWalletState("Wallet request was rejected or not supported by the detected provider.");
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
          <a href="#benefits">Why it matters</a>
          <a href="#get-started">Add RPC</a>
          <a href="#faq">FAQ</a>
        </nav>
      </header>

      <main>
        <section className="hero section-blue" id="hero">
          <div className="hero-copy">
            <p className="eyebrow">A drop-in privacy RPC for Ethereum</p>
            <h1>One RPC switch. Less wallet surveillance.</h1>
            <p className="hero-text">
              Cloakline routes wallet traffic through a privacy-preserving RPC layer and uses
              fhEVM to keep operational logging encrypted, pseudonymous, and write-only.
            </p>
            <ol className="hero-steps">
              <li>Add the Cloakline RPC to your wallet.</li>
              <li>Keep using Sepolia through the same normal wallet flow.</li>
              <li>Reduce direct provider linkage and public address exposure in logging.</li>
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
                <strong>Providers get the easiest path to build a wallet-linked dossier</strong>
              </div>
              <div className="hero-card hero-card-right">
                <p>Cloakline</p>
                <strong>Proxy path plus encrypted, write-only bucket logging</strong>
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
            <h2>Simple RPC UX. Better privacy posture.</h2>
            <p>
              Cloakline is designed to feel like an RPC replacement, not a research demo. Change
              one endpoint and keep using your wallet normally.
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
                making routine wallet surveillance harder to accumulate.
              </p>
            </article>
            <article className="benefit-card">
              <div className="benefit-icon coral">
                <EyeOff size={42} />
              </div>
              <h3>Write-only logging</h3>
              <p>
                fhEVM stores encrypted counts by salted bucket ID. Cloakline can write usage
                signals on-chain, but it cannot decrypt the history it accumulates.
              </p>
            </article>
            <article className="benefit-card">
              <div className="benefit-icon mint">
                <ShieldCheck size={42} />
              </div>
              <h3>Honest trust model</h3>
              <p>
                This MVP is built for unlinkability and dossier-risk reduction. It does not
                pretend the proxy itself is invisible.
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
              manual fields below. The endpoint is a placeholder for now and will be swapped for
              the live deployment later.
            </p>
          </div>
          <div className="starter-grid">
            <article className="starter-card">
              <div className="starter-card-head">
                <Sparkles size={20} />
                <span>One-click wallet setup</span>
              </div>
              <p className="starter-network">{siteConfig.rpc.chainName}</p>
              <button className="button button-primary button-wide" onClick={addToWallet}>
                Add to wallet
              </button>
              <p className="starter-note">
                {siteConfig.isPlaceholderRpc
                  ? "This card is wired for a placeholder endpoint right now. Swap the site env to your live RPC before the public deploy."
                  : "Best demo path: show the wallet prompt, switch the RPC, then send a normal transaction through Cloakline."}
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
            <h2>What changes when traffic flows through Cloakline?</h2>
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
                <li>Wallet analytics outside the RPC path remain outside Cloakline&apos;s control.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="faq section-mint" id="faq">
          <div className="section-head narrow">
            <p className="eyebrow">FAQ</p>
            <h2>Questions judges will probably ask first.</h2>
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
