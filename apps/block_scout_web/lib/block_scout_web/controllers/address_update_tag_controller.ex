defmodule BlockScoutWeb.UpdateTagAddressController do
  use BlockScoutWeb, :controller

  alias Explorer.Chain

  def index(conn, %{"address_id" => hash_string, "tags"=> newTags}) do
    with {:ok, []} <- Chain.update_address_tag(hash_string, newTags) do
      json(
        conn,
        %{
          result: true
        }
      )
    end
  end
end
