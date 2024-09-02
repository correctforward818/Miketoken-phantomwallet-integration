import {
  Flex,
  Grid,
  GridItem,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useMediaQuery,
} from "@chakra-ui/react";
import { ListWallets, WalletsConfig } from "@src/configs/web3/wallets";
import { useConnectWallet } from "@src/hooks/useConnectWallet";
import { useWeb3React } from "@src/hooks/useWeb3React";
import { isMobile } from "react-device-detect";
import { useSwitchNetwork } from "wagmi";
import WalletItem from "./WalletItem";
import { FC, useEffect, useState } from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { useAppDispatch } from "@src/redux/store";
import {
  updateSolanaAddress,
  updateWalletType,
} from "@src/redux/slices/user/actions";

interface IWalletModal {
  isOpen?: boolean;
  onDismiss?: () => void;
}

type PhantomEvent = "disconnect" | "connect" | "accountChanged";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

interface PhantomProvider {
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, callback: (args: any) => void) => void;
  isPhantom: boolean;
}

type WindowWithSolana = Window & {
  solana?: PhantomProvider;
};

const WalletModal: React.FC<IWalletModal> = ({
  isOpen = true,
  onDismiss = () => null,
}) => {
  const { chainId } = useWeb3React();
  const { switchNetwork } = useSwitchNetwork();
  const { login } = useConnectWallet();
  const [isExpanded, setIsExpanded] = useState(false);
  const dispatch = useAppDispatch();

  const handleConnectWallet = async (wallet: WalletsConfig): Promise<void> => {
    try {
      console.log(wallet?.title + "---------------------->");
      if (wallet?.title == "Phantom Wallet") {
        if (!wallet?.installed) {
          window.open(
            isMobile
              ? wallet?.downloadLink?.mobile
              : wallet?.downloadLink?.desktop,
            "_blank"
          );
          return;
        } else connectHandler();
      } else if (!wallet?.installed) {
        window.open(
          isMobile
            ? wallet?.downloadLink?.mobile
            : wallet?.downloadLink?.desktop,
          "_blank"
        );
        return;
      } else {
        switchNetwork && (await switchNetwork(chainId));
        setTimeout(() => {
          try {
            const web3Modal = document.getElementsByTagName("w3m-modal");
            if (web3Modal) {
              // @ts-ignore
              const root = web3Modal[0].shadowRoot;
              if (root) {
                const modal = root.children[0];
                if (modal) {
                  // @ts-ignore
                  modal.style.zIndex = "999999";
                }
              }
            }
          } catch (e) {
            /* empty */
          }
        }, 500);  
        await login(wallet?.connectorId, chainId);

        localStorage.setItem("wallet", wallet?.connectorId);
        onDismiss();
      }
    } catch (e) {
      /* empty */
    }
  };

  const sortedWallets = ListWallets.sort(
    (a, b) => a.priority - b.priority
  ).sort((a, b) => Number(b.installed) - Number(a.installed));

  const [isSmallThan480] = useMediaQuery("(max-width: 480px)", { ssr: true });

  //Phantom wallet connect
  const [walletAvail, setWalletAvail] = useState(false);
  const [provider, setProvider] = useState<PhantomProvider | null>(null);
  const [connected, setConnected] = useState(false);
  const [pubKey, setPubKey] = useState<PublicKey | null>(null);

  useEffect(() => {
    if ("phantom" in window) {
      const solWindow = window as WindowWithSolana;
      if (solWindow?.solana?.isPhantom) {
        setProvider(solWindow.solana);
        setWalletAvail(true);
        // Attemp an eager connection
        // solWindow.solana.connect({ onlyIfTrusted: true });
      }
    }
  }, []);

  useEffect(() => {
    provider?.on("connect", (publicKey: PublicKey) => {
      console.log(`connect event: ${publicKey}`);
      setConnected(true);
      setPubKey(publicKey);
      dispatch(updateWalletType({ type: "phantom" }));
      dispatch(updateSolanaAddress({ address: publicKey.toString() }));
      onDismiss();
    });
    provider?.on("disconnect", () => {
      console.log("disconnect event");
      dispatch(updateWalletType({ type: "" }));
      setConnected(false);
      setPubKey(null);
    });
  }, [provider]);

  const connectHandler: any = () => {
    console.log(`connect handler`);
    provider?.connect().catch((err) => {
      console.error("connect ERROR:", err);
    });
  };

  // const disconnectHandler: React.MouseEventHandler<HTMLButtonElement> = (event) => {
  //   console.log("disconnect handler");
  //   provider?.disconnect()
  //     .catch((err) => { console.error("disconnect ERROR:", err); });
  // }
  //--------------------end-------------------

  return (
    <Modal isOpen={isOpen} onClose={onDismiss} isCentered={!isSmallThan480}>
      <ModalOverlay />
      <ModalContent className={"p-4"}>
        <ModalHeader className={"mt-2 text-center"}>Connect wallet</ModalHeader>
        <ModalCloseButton onClick={onDismiss} />
        <ModalBody
          px={{
            base: 0,
            lg: 6,
          }}
        >
          <Grid className={"w-full gap-3"} templateColumns="repeat(2, 1fr)">
            {sortedWallets.slice(0, isExpanded ? 20 : 4).map((wallet) => (
              <GridItem key={wallet.title}>
                <WalletItem
                  walletConfig={wallet}
                  handleLogin={handleConnectWallet}
                />
              </GridItem>
            ))}
          </Grid>
          <Flex
            className={
              "prose-md prose mt-4 w-full cursor-pointer items-center justify-center gap-2 font-medium text-[#898F9C]"
            }
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Less" : "More"}
            <Icon
              viewBox="0 0 15 14"
              className={`transition duration-150 ease-in-out ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
              <path
                d="M11.5837 5.83331L7.50033 9.91665L3.41699 5.83331"
                stroke="#898F9C"
                fill={"none"}
                stroke-width="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Icon>
          </Flex>
          <button
            className={
              "mt-4 h-[40px] w-full rounded-3xl bg-primary-03 text-sm font-bold text-white"
            }
          >
            Learn how to connect wallet
          </button>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default WalletModal;
