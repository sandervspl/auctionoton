import { useFormState } from 'react-dom';
import { useState } from 'react';

import { createDashboardSection } from 'actions/dashboard';

export function useCreateSectionModal() {
  const [isOpen, setOpen] = useState(false);
  const [state, action] = useFormState(
    async (state: any, formdata: FormData) => {
      const result = await createDashboardSection(state, formdata);

      if (result.error) {
        return result;
      }

      setOpen(false);
      return result;
    },
    { error: '' },
  );

  return { isOpen, setOpen, action, state };
}
