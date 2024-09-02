import {
  Button,
  Flex,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  useMediaQuery,
} from "@chakra-ui/react";
import React, { memo, useEffect, useState } from "react";

//   import Icon from "@/components/Icon";
import { useConnectWallet } from "@src/hooks/useConnectWallet";
import { useWeb3React } from "@src/hooks/useWeb3React";
import { getTruncateHash } from "@src/utils/getTruncateHash";
import { useSelector } from "react-redux";
import { AppState } from "@src/redux/store";
import { PublicKey } from "@solana/web3.js";

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

const UserInfo: React.FC = () => {
  const { account } = useWeb3React();
  console.log(window + "-------------------------------");
  const [isMobileScreen] = useMediaQuery("(max-width: 768px)");
  const { logout } = useConnectWallet();
  const [provider, setProvider] = useState<PhantomProvider | null>(null);

  const userInfo = useSelector<AppState, AppState["user"]>(
    (state) => state.user
  );

  useEffect(() => {
    if ("solana" in window) {
      const solWindow = window as WindowWithSolana;
      if (solWindow?.solana?.isPhantom) {
        setProvider(solWindow.solana);

        // Attemp an eager connection
        solWindow.solana.connect({ onlyIfTrusted: true });
      }
    }
  }, []);

  const handleLogout = async () => {
    if (userInfo.walletType === "phantom") provider?.disconnect();
    else await logout();
  };

  return (
    <Popover
      trigger={isMobileScreen ? "click" : "hover"}
      placement="bottom-end"
    >
      <PopoverTrigger>
        <Flex
          bgColor="bg.brand !important"
          rounded="full"
          px={4}
          py={1}
          color="bg.default"
          borderRadius={"8px"}
          height={"42px"}
          alignItems="center"
        >
          {account && getTruncateHash(account, isMobileScreen ? 4 : 6)}
          {userInfo.walletType === "phantom" && getTruncateHash(userInfo.solanaAddress)}
        </Flex>
      </PopoverTrigger>
      <Portal>
        <PopoverContent mt={2} boxShadow="md" rounded="xl" border="none">
          <PopoverBody p={0}>
            <Button
              variant="primary"
              size="md"
              w="full"
              justifyContent="flex-start"
              onClick={handleLogout}
              color="bg.default"
              bgColor="bg.brand !important"
              // leftIcon={<Icon type="common" name="logout" />}
            >
              Disconnect
            </Button>
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
};

export default memo(UserInfo);
