import * as bodyParser from "body-parser";
import express from "express";
import { TonClient, WalletContractV3R2, internal } from "ton";
import {
  mnemonicToWalletKey,
  mnemonicToPrivateKey,
  mnemonicNew,
} from "ton-crypto";
import { Event } from "./wrappers/Event";
import { Address, Sender } from "ton-core";

const port: number = 3000;
const app: express.Application = express();
app.use(bodyParser.json());

app.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});

type Sender_2 = ReturnType<typeof WalletContractV3R2.create>["sender"];

let eventNew: Event, senderNew: Sender;

// API endpoint to create a new event
app.post("/event", async (req: express.Request, res: express.Response) => {
  try {
    // Configure the Ton client
    const client: TonClient = new TonClient({
      endpoint: "https://toncenter.com/api/v2/jsonRPC",
      // endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
      apiKey: req.body.tonApiKey,
    });
    console.log("api", req.body.tonApiKey);
    const mnemonic: string = req.body.seeds;
    console.log(req.body);
    const keypair = await mnemonicToWalletKey(mnemonic.split(" "));
    console.log(keypair.secretKey);
    const wallet: WalletContractV3R2 = WalletContractV3R2.create({
      publicKey: keypair.publicKey,
      workchain: 0,
    });

    console.log(
      `Wallet address ${wallet.address} ${wallet.init.data} ${wallet.init.code}`
    );

    const sender: Sender = wallet.sender(
      client.provider(wallet.address, wallet.init),
      keypair.secretKey
    );
    senderNew = sender;
    const event: Event = await Event.create(
      client,
      wallet.address,
      req.body.type
    );
    // const re = await event.deploy(sender);
    // console.log("event", re);

    // Get the Event address
    const addr: Address = event.address;
    console.log(`event address: ${addr}`);

    const response = {
      status: "success",
      message: "New event created successfully",
      data: {
        address: `${addr}`,
      },
    };
    eventNew = event;
    res.status(200).json(response);
  } catch (error: any) {
    console.log(error.message);
    const response = {
      status: "error",
      message: error.message,
      data: null,
    };
    res.status(400).json(response);
  }
});

// API endpoint to place bet on an event.
app.post("/event/bet", async (req: express.Request, res: express.Response) => {
  const { outcome, amount } = req.body;
  // input by me
  const client: TonClient = new TonClient({
    endpoint: "https://toncenter.com/api/v2/jsonRPC",
    // endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
    apiKey: req.body.tonApiKey,
  });

  // const mnemonic: string =
  //   "burger impose alone special echo help above exact medal reunion cage crawl ripple goat wrist alien theme stairs field coffee stamp pepper lock person";
  const mnemonic: string[] = await mnemonicNew();
  const keypair = await mnemonicToPrivateKey(mnemonic);
  console.log(keypair.secretKey);
  const wallet: WalletContractV3R2 = WalletContractV3R2.create({
    publicKey: keypair.publicKey,
    workchain: 0,
  });

  let contract = client.open(wallet);
  // Get balance
  let balance: bigint = await contract.getBalance();

  // Create a transfer
  let seqno: number = await contract.getSeqno();
  console.log(">>>>>", seqno);

  // console.log("transfer", transfer);

  // input by me
  const sender: Sender = wallet.sender(
    client.provider(wallet.address, wallet.init),
    keypair.secretKey
  );
  senderNew = sender;

  try {
    // await eventNew.bet(wallet, outcome, amount);
    // input by me
    await contract.sendTransfer({
      secretKey: keypair.secretKey,
      seqno: seqno,
      messages: [
        internal({
          to: "EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKnbdLIYI",
          value: "0.001", // 0.001 TON
          // body: "Hello", // optional comment
          // bounce: false,
        }),
      ],
    });
    const re = await eventNew.bet(sender, outcome, amount);
    console.log(">>>>>>>>>", re);
    res.status(200).json({ msg: "Bet placed successfully." });
  } catch (error) {
    console.error(">>>>>>>>>>>>", error);
    res.status(500).send("Error placing bet.");
  }
});

// API endpoint to start an event
app.post("/event/:address/start", async (req, res) => {
  try {
    await eventNew.startEvent(senderNew);
    const response = {
      status: "success",
      message: "Event started successfully",
      data: null,
    };
    res.status(200).json(response);
  } catch (error: any) {
    console.log(error);
    const response = {
      status: "error",
      message: error.message,
      data: null,
    };
    res.status(400).json(response);
  }
});

// API endpoint to finish an event
app.post("/event/:address/finish", async (req, res) => {
  try {
    const result = req.body.result;
    await eventNew.finishEvent(senderNew, result);
    const response = {
      status: "success",
      message: "Event finished successfully",
      data: null,
    };
    res.status(200).json(response);
  } catch (error: any) {
    console.log(error);
    const response = {
      status: "error",
      message: error.message,
      data: null,
    };
    res.status(400).json(response);
  }
});
