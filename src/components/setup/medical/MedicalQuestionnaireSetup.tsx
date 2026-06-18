import QuestionnaireBuilder from "./QuestionnaireBuilder";
import { GROUP_TYPE } from "./definitionsService";

export default function MedicalQuestionnaireSetup() {
  return (
    <QuestionnaireBuilder
      groupType={GROUP_TYPE.MEDICAL_QUESTIONNAIRE}
      title="Medical Questionnaire"
      subtitle="Build the patient medical questionnaire — sections and questions"
    />
  );
}
