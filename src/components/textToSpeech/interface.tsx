import BookModel from "../../model/Book";
import HtmlBook from "../../model/HtmlBook";

export interface TextToSpeechProps {
  locations: any;
  currentBook: BookModel;
  htmlBook: HtmlBook;
  isReading: boolean;
  t: (title: string) => string;
  handleTextSpeech: (isTextSpeech: boolean) => void;
}
export interface TextToSpeechState {
  isSupported: boolean;
  isAudioOn: boolean;
}
