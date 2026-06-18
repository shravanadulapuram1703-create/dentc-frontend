import QuestionnaireBuilder from "./QuestionnaireBuilder";
import { GROUP_TYPE } from "./definitionsService";

export default function DentalQuestionnaireSetup() {
  return (
    <QuestionnaireBuilder
      groupType={GROUP_TYPE.DENTAL_QUESTIONNAIRE}
      title="Dental Questionnaire"
      subtitle="Build the patient dental questionnaire — sections and questions"
    />
  );
}
