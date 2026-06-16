import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import ProgramForm, { programToFormState } from '../components/ProgramForm.jsx';
import { ChevronLeftIcon } from '../components/Icons.jsx';

export default function EditProgramPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .program(id)
      .then((p) => active && setProgram(p))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [id]);

  const back = (
    <button
      type="button"
      onClick={() => navigate(`/programs/${id}`)}
      aria-label="Back"
      style={{ display: 'flex', color: 'var(--text-secondary)' }}
    >
      <ChevronLeftIcon width={24} height={24} />
    </button>
  );

  const formState = program ? programToFormState(program) : null;

  return (
    <>
      <TopNav title="Edit Program" left={back} />
      {error && <div className="empty">{error}</div>}
      {!program && !error && <div className="spinner" />}
      {formState && (
        <ProgramForm
          key={program.id}
          heading="Edit program"
          subtitle="Update your weekly plan."
          initialDisplayName={formState.displayName}
          initialDurationWeeks={formState.durationWeeks}
          initialSelectedDays={formState.selectedDays}
          initialDayDrafts={formState.dayDrafts}
          submitLabel="Save changes"
          onSubmit={async (payload) => {
            await api.updateProgram(id, payload);
            navigate(`/programs/${id}`);
          }}
        />
      )}
    </>
  );
}
