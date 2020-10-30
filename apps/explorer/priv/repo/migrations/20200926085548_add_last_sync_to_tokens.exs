defmodule Explorer.Repo.Migrations.AddLastSyncToTokens do
  use Ecto.Migration

  def change do
    alter table(:tokens) do
      add(:last_sync, :utc_datetime_usec, null: true)
    end
  end
end
