defmodule Explorer.Repo.Migrations.AddTagsToAddresses do
  use Ecto.Migration

  def change do
    alter table(:addresses) do
      add(:tags, :string, null: true)
    end
  end
end
