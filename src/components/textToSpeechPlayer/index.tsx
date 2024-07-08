import { withTranslation } from "react-i18next";
import { connect } from "react-redux";
import TextToSpeechPlayer from "./component";
import { stateType } from "../../store";

const mapStateToProps = (state: stateType) => {
  return {
    currentBook: state.book.currentBook,
    htmlBook: state.reader.htmlBook,
    locations: state.progressPanel.locations,
    isReading: state.book.isReading,
  };
};
const actionCreator = {};
export default connect(
  mapStateToProps,
  actionCreator
)(withTranslation()(TextToSpeechPlayer as any) as any);
