import { useState } from 'react'
import { FormField } from '../components/FormField'
import { deriveGroupCode } from '../utils/groupCode'
import { setUserSetupComplete } from '../utils/storage'
import { createUserProfile } from '../db/userProfile'
import { createTrail } from '../db/trails'

interface UserSetupScreenProps {
  onCreateComplete: () => void
}

export function UserSetupScreen({ onCreateComplete }: UserSetupScreenProps) {
  const [name, setName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const groupCode = groupName.trim() ? deriveGroupCode(groupName) : ''
  const canSubmit =
    name.trim().length > 0 && groupName.trim().length > 0 && !isSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    try {
      const profile = await createUserProfile({
        name: name.trim(),
        groupName: groupName.trim(),
        groupCode,
      })

      await createTrail({
        groupCode: profile.groupCode,
        trailType: 'graveyard',
        displayName: `${profile.groupName} Graveyard Trail`,
      })
      await createTrail({
        groupCode: profile.groupCode,
        trailType: 'parish',
        displayName: `${profile.groupName} Parish Trail`,
      })

      setUserSetupComplete()
      onCreateComplete()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-white p-6 max-w-[680px] mx-auto">
      <h1 className="text-3xl font-bold text-govuk-text mb-4">
        Welcome to The Memory Trail
      </h1>
      <p className="text-lg text-govuk-text mb-8">
        The Memory Trail helps your community record and share local heritage.
        Tell us a little about yourself to get started.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="name"
          label="Your Name"
          value={name}
          onChange={setName}
          placeholder="e.g. Sheila, Mikey"
          required
        />
        <FormField
          id="groupName"
          label="Your Group Name"
          value={groupName}
          onChange={setGroupName}
          placeholder="e.g. Clonfert Trails, Clashmore Trails"
          required
        />

        {groupName.trim() && (
          <div className="mb-6 space-y-1">
            <p className="text-lg text-govuk-text" aria-live="polite">
              Your trails will be: {groupName.trim()} Graveyard Trail and{' '}
              {groupName.trim()} Parish Trail
            </p>
            {groupCode && (
              <p className="text-base text-govuk-muted">
                Your site code will be: {groupCode}
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full min-h-[56px] bg-tmt-teal text-white text-lg font-bold px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Create my trails"
        >
          Create My Trails
        </button>
      </form>
    </main>
  )
}
