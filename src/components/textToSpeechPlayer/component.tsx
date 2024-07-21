import React from "react";
import { TextToSpeechPlayerProps, TextToSpeechPlayerState } from "./interface";
import StorageUtil from "../../utils/serviceUtils/storageUtil";
import { sleep } from "../../utils/commonUtil";
import RecordLocation from "../../utils/readUtils/recordLocation";
import BingTTSUtil from "../../utils/serviceUtils/bingTTSUtil";

import "./index.css";

import { Howl } from "howler";

class TextToSpeechPlayer extends React.Component<
  TextToSpeechPlayerProps,
  TextToSpeechPlayerState
> {
  player: any;
  timer: any;
  voices: any;
  currentNode: string[];
  currentNodeIndex: number;
  constructor(props: TextToSpeechPlayerProps) {
    super(props);
    this.state = {
      isSpeechOn: false,
      isPlaying: false,
      isMuted: false,
    };
    this.voices = [];
    this.currentNode = [];
    this.currentNodeIndex = 0;
  }
  async componentDidMount() {
    if (this.state.isSpeechOn) {
      this.setState({ isSpeechOn: false });
    }

    this.voices = await BingTTSUtil.getVoiceList();
  };
  async UNSAFE_componentWillReceiveProps(props: TextToSpeechPlayerProps) {
    if (props.htmlBook !== this.props.htmlBook && props.htmlBook) {
      props.htmlBook.rendition.on("page-changed", async () => {
        if (this.state.isSpeechOn) {
          if (this.player && this.player.playing()) {
            this.player.stop();
          }
          clearTimeout(this.timer);

          this.currentNodeIndex = 0;
          if (this.state.isPlaying) {
            this.handleLazySpeech();
          }
        }
      });
    }
  };
  handleGetNativeSpeech = async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(window.speechSynthesis.getVoices());
      }, 10)
    });
  };
  handleStartSpeech = async () => {
    this.setState({ isSpeechOn: true }, () => {
      this.handleGetText();
      this.handleRead();
    });
  };
  handleLazySpeech = async () => {
    this.setState({ isSpeechOn: false }, () => {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.setState({ isSpeechOn: true }, () => {
          this.handleGetText();
          this.handleRead();
        })
      }, 200)
    });
  };
  handleGetText = async () => {
    if (StorageUtil.getReaderConfig("isSliding") === "yes") {
      await sleep(1000);
    }
    this.currentNode = this.props.htmlBook.rendition
      .audioText()
      .filter((item: string) => item && item.trim());
    // if (this.currentNode.length === 0) {
    //   await this.props.htmlBook.rendition.next();
    //   this.currentNode = await this.handleGetText();
    // }
    return this.currentNode;
  };
  handleHightLightText = async (text: string, isHighlight: boolean = true) => {
    let Bg = "background: #f3a6a68c";

    this.props.htmlBook.rendition.highlightNode(text, isHighlight ? Bg : "") ;
  };
  handleCacheAudio = async (voiceText: string) => {
    let voiceIndex = StorageUtil.getReaderConfig("voiceIndex") || 0;
    let voiceNative = window.speechSynthesis.getVoices();
    let voiceName = this.voices[voiceIndex - voiceNative.length].ShortName;
    let speed = StorageUtil.getReaderConfig("voiceSpeed") || 1;
    return window.require("electron").ipcRenderer.invoke("edge-tts", {
      text: BingTTSUtil.createSSML(
        voiceText
          .replace(/\s\s/g, "")
          .replace(/\r/g, "")
          .replace(/\n/g, "")
          .replace(/\t/g, "")
          .replace(/&/g, "")
          .replace(/\f/g, ""),
        voiceName,
        speed
      ),
      format: "",
    });
  };
  async handleRead() {

    for (let index = this.currentNodeIndex; index < this.currentNode.length; index++) {
      let currentText = this.currentNode[index];
      this.currentNodeIndex = index;
      this.handleHightLightText(currentText);

      // console.log('now speeching: ', index, currentText);
      let src = await this.handleCacheAudio(currentText)

      let res = await this.handleSpeech(src);
      // Page End Check
      if (
        this.currentNode[index] ===
        this.props.htmlBook.rendition.visibleText()[
          this.props.htmlBook.rendition.visibleText().length - 1
        ]
      ) {
        await this.props.htmlBook.rendition.next();
        break;
      }
      // Page Done
      if (res === "end") {
        break;
      }
      // Jump Out
      if (res === "stop") {
        return;
      }
    };
    if (this.state.isSpeechOn && this.props.isReading) {
      // console.log('Chapter Changed');
      await window.require("electron").ipcRenderer.invoke("clear-tts");

      let position = this.props.htmlBook.rendition.getPosition();
      RecordLocation.recordHtmlLocation(
        this.props.currentBook.key,
        position.text,
        position.chapterTitle,
        position.chapterDocIndex,
        position.chapterHref,
        position.count,
        position.percentage,
        position.cfi,
        position.page
      );
      this.currentNode = [];
      this.currentNodeIndex = 0;
      await this.handleLazySpeech();
    }
  };
  handleSetupPlayer = async (src: string[]) => {
    return new Promise<string>(async (resolve, reject) => {
      if (this.player && this.player.playing()) {
        this.player.stop();
      }

      this.player = new Howl({
        src: src,
        onloaderror: async () => {
          resolve("error");
        },
        onload: async () => {
          this.player.mute(this.state.isMuted);
          resolve("start");
        },
        onplay: () => {
          this.setState({ isPlaying: true })
        },
        onplayerror: async () => {
          resolve("error");
        },
        onpause: () => {
          this.setState({ isPlaying: false })
        }
      });
    });
  };
  handleSpeech = async (src: string[]) => {
    return new Promise<string>(async (resolve, reject) => {
      let res = await this.handleSetupPlayer(src);
      if (res === "error") {
         resolve("start");
      } else {
        this.player.play();
        this.player.on("stop", async (id : any) => {
          resolve("stop");
        });
        this.player.on("end", async () => {
          if (!(this.state.isSpeechOn && this.props.isReading)) {
            resolve("end");
          }
          resolve("start");
        });
      }
    });
  };
  handleStopSpeech() {
    if (!this.state.isSpeechOn) return;
    this.handleHightLightText(this.currentNode[this.currentNodeIndex], false);
    this.setState({ isSpeechOn: false, isPlaying: false });

    if (this.player) {
      this.player.stop();
    }

    this.player = null;

    this.currentNodeIndex = 0;
  }
  handlePreviousSpeech() {
    this.currentNodeIndex--;
    if (this.currentNodeIndex < 0) {
      this.currentNodeIndex = 0;
      this.props.htmlBook.rendition.prev();
    }
    this.handleHightLightText(this.currentNode[this.currentNodeIndex]);
    this.handleLazySpeech();
  };
  handleStartOrPauseSpeech() {
    if (!this.player) {
      this.handleStartSpeech();
      return;
    };

    if (this.player.playing()) {
      this.player.pause();
    } else {
      this.player.play();
    }
  };
  handleNextSpeech() {
    this.currentNodeIndex++;
    if (this.currentNodeIndex >= this.currentNode.length && this.currentNode.length > 0) {
      this.currentNodeIndex = this.currentNode.length - 1;
    }
    if (
      this.currentNode[this.currentNodeIndex - 1] ===
      this.props.htmlBook.rendition.visibleText()[
        this.props.htmlBook.rendition.visibleText().length - 1
      ]
    ) {
      this.currentNodeIndex = 0;
      this.props.htmlBook.rendition.next();
    }
    this.handleHightLightText(this.currentNode[this.currentNodeIndex]);
    this.handleLazySpeech();
  };
  handleMuteSpeech() {
    this.setState({ isMuted: !this.state.isMuted }, () => {
      if (this.player) {
        this.player.mute(this.state.isMuted);
      }
    });
  };
  render() {
    return (
      <>
        {
          <>
            {/* <div className=""></div> */}
            <span className="player-button stop-player-button"
                onClick={() => {
                  this.handleStopSpeech();
                }}
                style={
                  this.state.isSpeechOn
                  ? {}
                  : { opacity: "0.6" }
                }
            >
              Stop
            </span>
            <span className="player-button previous-player-button"
                onClick={() => {
                  this.handlePreviousSpeech();
                }}
            >
              Previous
            </span>
            <span className="player-button sp-player-button"
                onClick={() => {
                  this.handleStartOrPauseSpeech();
                }}
                style={
                  this.state.isPlaying
                  ? {} 
                  : { opacity: "0.6" }
                }
            >
              {this.state.isPlaying ? 'Pause' : 'Play'}
            </span>
            <span className="player-button next-player-button"
                onClick={() => {
                  this.handleNextSpeech();
                }}
            >
              Next
            </span>
            <span className="player-button mute-player-button"
                onClick={() => {
                  this.handleMuteSpeech();
                }}
                style={
                  this.state.isMuted
                  ? {} 
                  : { opacity: "0.6" }
                }
            >
              {this.state.isMuted ? 'Muted' : 'Mute'}
            </span>
          </>
        }
      </>
    );
  }
}

export default TextToSpeechPlayer;
