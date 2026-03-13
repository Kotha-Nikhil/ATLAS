import { useAuthStore } from '@/store/authStore'

export function UserBadge() {
  const user = useAuthStore((s) => s.user)
  if (!user) return null
  return (
    <span className="text-[10px] text-ed-muted" aria-label={`Logged in as ${user.name}, role ${user.role}`}>
      {user.name} <span className="text-ed-teal font-bold">({user.role})</span>
    </span>
  )
}
