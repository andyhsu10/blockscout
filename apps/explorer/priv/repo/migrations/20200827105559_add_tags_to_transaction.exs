defmodule Explorer.Repo.Migrations.AddTagsToTransaction do
  use Ecto.Migration

  def change do
    alter table(:transactions) do
      add(:tags, :string, null: true)
    end
  end
end
