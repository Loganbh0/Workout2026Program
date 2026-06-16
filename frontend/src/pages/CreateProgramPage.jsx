import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import TopNav from '../components/TopNav.jsx';
import ProgramForm from '../components/ProgramForm.jsx';
import { ChevronLeftIcon } from '../components/Icons.jsx';

export default function CreateProgramPage() {
  const navigate = useNavigate();

  const back = (
    <button
      type="button"
      onClick={() => navigate('/home')}
      aria-label="Back"
      style={{ display: 'flex', color: 'var(--text-secondary)' }}
    >
      <ChevronLeftIcon width={24} height={24} />
    </button>
  );

  return (
    <>
      <TopNav title="New Program" left={back} />
      <ProgramForm
        heading="Create program"
        subtitle="Build a custom weekly plan."
        onSubmit={async (payload) => {
          const program = await api.createProgram(payload);
          navigate(`/programs/${program.id}`);
        }}
      />
    </>
  );
}
