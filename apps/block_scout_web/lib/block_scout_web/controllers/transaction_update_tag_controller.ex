defmodule BlockScoutWeb.UpdateTagTransactionController do
  use BlockScoutWeb, :controller

  alias BlockScoutWeb.TransactionView
  alias Explorer.Chain

  def index(conn, %{"transaction_id" => hash_string, "tags"=> newTags}) do
    with {:ok, []} <- Chain.update_transaction_tag(hash_string, newTags) do
      # if Chain.transaction_has_token_transfers?(hash_string) do
      #   redirect(conn, to: transaction_token_transfer_path(conn, :index, hash_string))
      # else
      #   redirect(conn, to: transaction_internal_transaction_path(conn, :index, hash_string))
      # end
      json(
        conn,
        %{
          result: true
        }
      )
    else
      {:error, "Update Failed."} ->
        conn
        |> put_status(422)
        |> put_view(TransactionView)
        |> render("invalid.html", transaction_hash: hash_string, tags: newTags)
    end
  end
end
