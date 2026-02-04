"use client";

import { FC, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { IoCloudUploadOutline, IoTrashOutline } from "react-icons/io5";
import { type PutBlobResult } from "@vercel/blob";
import Image from "next/image";
import { BarLoader } from "react-spinners";
import { Amenities } from "@prisma/client";
import { saveRoom } from "@/lib/action";
import { clsx } from "clsx";
import { RoomProp } from "@/types/room";

/**
 * CreateForm Component
 * Form untuk membuat data kamar hotel baru dengan fitur upload gambar
 */
const EditForm = ({
  amenities,
  room,
}: {
  amenities: Amenities[];
  room: RoomProp;
}) => {
  // Ref untuk akses input file secara programmatik
  const inputFileRef = useRef<HTMLInputElement>(null);

  // State management
  const [image, setImage] = useState(room.image); // Menyimpan URL gambar yang sudah di-upload
  const [message, setMessage] = useState(""); // Menyimpan pesan error upload
  const [pending, startTransition] = useTransition(); // Loading state untuk async operation

  /**
   * Handler untuk upload gambar ke Vercel Blob Storage
   * Dipanggil otomatis saat user memilih file
   */
  const handleUpload = () => {
    if (!inputFileRef.current?.files) return null;

    const file = inputFileRef.current.files[0];
    const formData = new FormData();
    formData.set("file", file);

    // startTransition membungkus async operation agar React bisa track loading state
    startTransition(async () => {
      try {
        const response = await fetch("/api/upload", {
          method: "PUT",
          body: formData,
        });
        const data = await response.json();

        if (response.status !== 200) {
          setMessage(data.message);
        }

        const img = data as PutBlobResult;
        setImage(img.url);
      } catch (error) {
        console.log(error);
      }
    });
  };

  /**
   * Handler untuk menghapus gambar dari storage
   */
  const deleteImage = (image: string) => {
    startTransition(async () => {
      try {
        await fetch(`/api/upload/?imageUrl=${image}`, {
          method: "DELETE",
        });
        setImage("");
      } catch (error) {
        console.log(error);
      }
    });
  };

  const [state, formAction, isPending] = useActionState(
    saveRoom.bind(null, image),
    null,
  );

  const checkedAmenities = room.RoomAmenities.map((item) => item.amenityId);

  return (
    <form action={formAction}>
      {/* Grid 12 kolom: 8 untuk form inputs, 4 untuk upload & actions */}
      <div className="grid md:grid-cols-12 gap-5">
        {/* LEFT SECTION - Form Inputs */}
        <div className="col-span-8 bg-white p-4">
          {/* Input: Nama Kamar */}
          <div className="mb-4">
            <input
              type="text"
              name="name"
              defaultValue={room.name}
              placeholder="Room name"
              className="py-2 px-4 rounded-md border border-gray-400 w-full"
            />
            <div aria-live="polite" aria-atomic="true">
              <span className="text-sm text-red-500 mt-2">
                {state?.error?.name}
              </span>
            </div>
          </div>

          {/* Input: Deskripsi Kamar */}
          <div className="mb-4">
            <textarea
              name="description"
              rows={8}
              defaultValue={room.description}
              placeholder="description"
              className="py-2 px-4 rounded-md border border-gray-400 w-full"
            ></textarea>
            <div aria-live="polite" aria-atomic="true">
              <span className="text-sm text-red-500 mt-2">
                {state?.error?.description}
              </span>
            </div>
          </div>

          {/* Amenities Checkboxes - Loop dari database */}
          <div className="mb-4 grid md:grid-cols-3">
            {amenities.map((item) => (
              // TODO: Kurang key={item.id}, value={item.id}, dan ganti "Spa" jadi {item.name}
              <div className="flex items-center mb-4" key={item.id}>
                <input
                  type="checkbox"
                  name="amenities"
                  defaultValue={item.id}
                  defaultChecked={checkedAmenities.includes(item.id)}
                  placeholder="Room name"
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ms-2 text-sm font-medium text-gray-900 capitalize">
                  {item.name}
                </label>
              </div>
            ))}
            <div aria-live="polite" aria-atomic="true">
              <span className="text-sm text-red-500 mt-2">
                {state?.error?.amenities}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION - Upload Image & Additional Inputs */}
        <div className="col-span-4 bg-white p-4">
          {/* Upload Area - Click untuk trigger input file */}
          <label
            htmlFor="input-file"
            className="flex flex-col mb-4 items-center justify-center aspect-video border-2 border-gray-300 border-dashed rounded-md cursor-pointer bg-gray-50 relative"
          >
            <div className="flex flex-col items-center justify-center text-gray-500 pt-5 pb-6 z-10">
              {/* Loading indicator saat upload/delete */}
              {pending ? <BarLoader /> : null}

              {/* Jika ada gambar: tampilkan tombol delete */}
              {image ? (
                <button
                  type="button"
                  onClick={() => deleteImage(image)}
                  className="flex items-center justify-center bg-transparent size-6 rounded-sm absolute right-1 top-1 text-white hover:bg-red-400"
                >
                  <IoTrashOutline className="size-4 text-transparent hover:text-white" />
                </button>
              ) : (
                // Jika belum ada gambar: tampilkan upload prompt
                <div className="flex flex-col items-center justify-center">
                  <IoCloudUploadOutline className="size-8" />
                  <p className="mb-1 text-sm font-bold">Select Image</p>
                  {message ? (
                    <p className="mb-1 text-xs text-red-500">{message}</p>
                  ) : (
                    <p className="text-xs">
                      SVG, PNG, JPG, GIF, or other (max: 4MB)
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Conditional: Input file (hidden) atau Preview gambar */}
            {!image ? (
              <input
                type="file"
                ref={inputFileRef}
                id="input-file"
                className="hidden"
                onChange={handleUpload} // Auto upload saat file dipilih
              />
            ) : (
              // Preview gambar yang sudah di-upload
              <Image
                src={image}
                alt="image"
                width={640}
                height={360}
                className="rounded-md absolute aspect-video object-cover"
              />
            )}
          </label>

          {/* Input: Kapasitas Kamar */}
          <div className="mb-4">
            <input
              type="text"
              name="capacity"
              defaultValue={room.capacity}
              placeholder="Capacity..."
              className="py-2 px-4 rounded-md border border-gray-400 w-full"
            />
            <div aria-live="polite" aria-atomic="true">
              <span className="text-sm text-red-500 mt-2">
                {state?.error?.capacity}
              </span>
            </div>
          </div>

          {/* Input: Harga Kamar */}
          <div className="mb-4">
            <input
              type="text"
              name="price"
              defaultValue={room.price}
              placeholder="Price..."
              className="py-2 px-4 rounded-md border border-gray-400 w-full"
            />
            <div aria-live="polite" aria-atomic="true">
              <span className="text-sm text-red-500 mt-2">
                {state?.error?.price}
              </span>
            </div>
          </div>
          {/* General Message */}
          {state?.message ? (
            <div className=" p-1 text-red-500 mb-4">
              <span className="text-[15px] font-medium mt-2">
                {state.message}
              </span>
            </div>
          ) : null}
          {/* Submit Button */}
          <button
            type="submit"
            className={clsx(
              "bg-orange-400 text-white px-6 rounded-md w-full hover:bg-orange-500 py-2.5 md:px-10 text-lg font-semi-bold cursor-pointer text",
              {
                "opacity-50 cursor-not-allowed": isPending,
              },
            )}
            disabled={isPending}
          >
            {isPending ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default EditForm;
