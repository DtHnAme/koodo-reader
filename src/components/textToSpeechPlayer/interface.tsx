import BookModel from "../../model/Book";
import HtmlBook from "../../model/HtmlBook";

export interface TextToSpeechPlayerProps {
  locations: any;
  currentBook: BookModel;
  htmlBook: HtmlBook;
  isReading: boolean;
  handleTextSpeech: (isTextSpeech: boolean) => void;
  t: (title: string) => string;
}
export interface TextToSpeechPlayerState {
  isSpeechOn: boolean;
  isPlaying: boolean;
}
