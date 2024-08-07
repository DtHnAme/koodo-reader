import { withTranslation } from "react-i18next";
import { connect } from "react-redux";
import TextToSpeech from "./component";
import { stateType } from "../../store";
import { handleTextSpeech } from "../../store/actions";

const mapStateToProps = (state: stateType) => {
  return {
    currentBook: state.book.currentBook,
    htmlBook: state.reader.htmlBook,
    locations: state.progressPanel.locations,
    isReading: state.book.isReading,
    isTextSpeech: state.manager.isTextSpeech,
  };
};
const actionCreator = {
  handleTextSpeech
};
export default connect(
  mapStateToProps,
  actionCreator
)(withTranslation()(TextToSpeech as any) as any);
