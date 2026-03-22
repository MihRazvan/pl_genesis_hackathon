import {
  ArrowRight,
  Copy,
  EyeOff,
  Link2Off,
  Network,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { createStore, type EIP1193Provider, type EIP6963ProviderDetail } from "mipd";
import { useEffect, useState } from "react";
import { manualFields, siteConfig } from "./siteConfig";

type InjectedProvider = EIP1193Provider & {
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  providers?: InjectedProvider[];
};

type WalletOption = {
  id: string;
  name: string;
  icon?: string;
  provider: EIP1193Provider;
  source: "eip6963" | "fallback";
};

function getWalletKind(wallet?: WalletOption): "metamask" | "rabby" | "coinbase" | "other" | "none" {
  if (!wallet) {
    return "none";
  }

  const name = wallet.name.toLowerCase();
  if (name.includes("metamask")) {
    return "metamask";
  }
  if (name.includes("rabby")) {
    return "rabby";
  }
  if (name.includes("coinbase")) {
    return "coinbase";
  }

  return "other";
}

function getFallbackInjectedProvider(): InjectedProvider | undefined {
  const maybeWindow = window as Window & {
    ethereum?: InjectedProvider;
    rabby?: { ethereum?: InjectedProvider };
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
      ethereum.providers.find((provider: InjectedProvider) => provider.isRabby) ??
      ethereum.providers.find((provider: InjectedProvider) => provider.isMetaMask) ??
      ethereum.providers.find((provider: InjectedProvider) => provider.isCoinbaseWallet) ??
      ethereum.providers[0]
    );
  }

  return ethereum;
}

function getFallbackWalletName(provider: InjectedProvider): string {
  if (provider.isRabby) {
    return "Rabby";
  }
  if (provider.isMetaMask) {
    return "MetaMask";
  }
  if (provider.isCoinbaseWallet) {
    return "Coinbase Wallet";
  }

  return "Injected Wallet";
}

function toWalletOptions(providerDetails: readonly EIP6963ProviderDetail[]): WalletOption[] {
  return providerDetails.map((detail) => ({
    id: detail.info.uuid,
    name: detail.info.name,
    icon: detail.info.icon,
    provider: detail.provider,
    source: "eip6963"
  }));
}

function pickPreferredWallet(options: WalletOption[]): WalletOption | undefined {
  if (options.length === 0) {
    return undefined;
  }

  return (
    options.find((option) => option.name.toLowerCase().includes("rabby")) ??
    options.find((option) => option.name.toLowerCase().includes("metamask")) ??
    options.find((option) => option.name.toLowerCase().includes("coinbase")) ??
    options[0]
  );
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
      "No. The goal is one RPC switch: point your existing wallet at Cloakline and keep the normal flow."
  }
];

function App() {
  const [copyState, setCopyState] = useState<string | null>(null);
  const [walletState, setWalletState] = useState<string | null>(null);
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  useEffect(() => {
    const store = createStore();

    function refreshWalletOptions(providerDetails: readonly EIP6963ProviderDetail[]) {
      const discoveredWallets = toWalletOptions(providerDetails);

      if (discoveredWallets.length > 0) {
        setWalletOptions(discoveredWallets);
        setSelectedWalletId((current) => {
          if (current && discoveredWallets.some((wallet) => wallet.id === current)) {
            return current;
          }

          return pickPreferredWallet(discoveredWallets)?.id ?? null;
        });
        return;
      }

      const fallbackProvider = getFallbackInjectedProvider();
      if (fallbackProvider) {
        const fallbackWallet = {
          id: "fallback-injected-wallet",
          name: getFallbackWalletName(fallbackProvider),
          provider: fallbackProvider,
          source: "fallback" as const
        };

        setWalletOptions([fallbackWallet]);
        setSelectedWalletId(fallbackWallet.id);
        return;
      }

      setWalletOptions([]);
      setSelectedWalletId(null);
    }

    const unsubscribe = store.subscribe((providerDetails) => {
      refreshWalletOptions(providerDetails);
    }, {
      emitImmediately: true
    });

    const timeoutId = window.setTimeout(() => {
      refreshWalletOptions(store.getProviders());
    }, 900);

    return () => {
      unsubscribe();
      store.destroy();
      window.clearTimeout(timeoutId);
    };
  }, []);

  const selectedWallet =
    walletOptions.find((wallet) => wallet.id === selectedWalletId) ?? walletOptions[0];
  const walletKind = getWalletKind(selectedWallet);

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
    const injectedProvider = selectedWallet?.provider ?? getFallbackInjectedProvider();

    if (!injectedProvider) {
      setWalletState(
        "No injected wallet detected. Open this page in a browser with a wallet extension enabled, or use the manual RPC details instead."
      );
      return;
    }

    if (walletKind === "metamask") {
      setWalletState(
        "MetaMask already knows Sepolia. Edit the existing Sepolia RPC URL and replace it with Cloakline instead of adding a second Sepolia network."
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
      setWalletState(
        `Network request sent${selectedWallet ? ` to ${selectedWallet.name}` : ""}. If no prompt appears, the chain may already exist in your wallet and you can switch the RPC URL manually.`
      );
    } catch {
      setWalletState(
        `Wallet request was rejected or not supported${selectedWallet ? ` by ${selectedWallet.name}` : ""}. Use the manual RPC details below to finish setup.`
      );
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
              manual fields below to add Cloakline manually.
            </p>
          </div>
          <div className="starter-grid">
            <article className="starter-card">
              <div className="starter-card-head">
                <Sparkles size={20} />
                <span>One-click wallet setup</span>
              </div>
              <p className="starter-network">{siteConfig.rpc.chainName}</p>
              {walletOptions.length > 0 ? (
                <>
                  <p className="detected-note">Detected wallets</p>
                  <div className="wallet-options" role="list" aria-label="Detected wallets">
                    {walletOptions.map((wallet) => (
                      <button
                        key={wallet.id}
                        type="button"
                        className={`wallet-option${wallet.id === selectedWallet?.id ? " active" : ""}`}
                        onClick={() => setSelectedWalletId(wallet.id)}
                      >
                        {wallet.icon ? <img src={wallet.icon} alt="" /> : <span className="wallet-dot" />}
                        <span>{wallet.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <button className="button button-primary button-wide" onClick={addToWallet}>
                {walletKind === "metamask"
                  ? "Show MetaMask steps"
                  : selectedWallet
                    ? `Add to ${selectedWallet.name}`
                    : "Add to wallet"}
              </button>
              <p className="starter-note">
                Switch one RPC endpoint, then keep using your wallet normally.
              </p>
              {walletKind === "metamask" ? (
                <p className="starter-note">
                  MetaMask already includes Sepolia, so the clean setup path is to edit Sepolia and
                  replace its RPC URL with Cloakline.
                </p>
              ) : null}
              {walletKind === "rabby" ? (
                <p className="starter-note">
                  Rabby can usually open the network prompt directly. If the prompt does not appear,
                  the network may already exist and you can switch the RPC URL manually.
                </p>
              ) : null}
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
